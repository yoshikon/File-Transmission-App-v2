import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Cron-Secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret) {
      const incoming = req.headers.get("X-Cron-Secret");
      const authHeader = req.headers.get("Authorization");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      const validCronSecret = incoming === cronSecret;
      const validServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

      if (!validCronSecret && !validServiceRole) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const url = new URL(req.url);
    const task = url.searchParams.get("task") || "all";

    const results: Record<string, unknown> = {};

    if (task === "all" || task === "expiry-warnings") {
      results.expiryWarnings = await processExpiryWarnings(supabase, resendApiKey);
    }

    if (task === "all" || task === "daily-digest") {
      results.dailyDigest = await processDailyDigest(supabase, resendApiKey);
    }

    if (task === "all" || task === "scheduled-send") {
      results.scheduledSend = await processScheduledDeliveries(supabase, resendApiKey);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    pdf: "📄", doc: "📝", docx: "📝",
    xls: "📊", xlsx: "📊", csv: "📊",
    ppt: "📋", pptx: "📋",
    zip: "🗜️", tar: "🗜️", gz: "🗜️",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", svg: "🖼️",
    mp4: "🎬", mov: "🎬",
    mp3: "🎵", wav: "🎵",
    txt: "📄",
  };
  return map[ext] || "📁";
}

function getExtDisplay(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext ? ext.toUpperCase() : "FILE";
}

function formatExpiryDisplay(expiresAt: string): string {
  const d = new Date(expiresAt);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}まで`;
}

function buildEmailHtml(
  subject: string,
  message: string,
  senderName: string,
  senderCompany: string,
  recipientEmail: string,
  files: { file_name: string; file_size: number; file_extension: string; file_token: string }[],
  expiresAt: string,
  downloadLimit: number | null,
  appUrl: string,
  recipientToken: string,
): string {
  const recipientName = recipientEmail.split("@")[0];
  const expiryDisplay = formatExpiryDisplay(expiresAt);
  const limitDisplay = downloadLimit ? `${downloadLimit}回まで` : "制限なし";
  const bulkUrl = `${appUrl}/d/${recipientToken}`;

  const fileRows = files.map((f) => {
    const icon = getFileIcon(f.file_name);
    const ext = getExtDisplay(f.file_name);
    const size = formatFileSize(f.file_size);
    const fileUrl = `${appUrl}/d/${recipientToken}/f/${f.file_token}`;
    return `
    <tr>
      <td style="padding: 6px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border:1px solid #DBEAFE;border-radius:6px;">
          <tr>
            <td style="padding:12px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;width:30px;vertical-align:middle;">${icon}</td>
                  <td style="vertical-align:middle;">
                    <span style="color:#1E293B;font-weight:bold;font-size:14px;">${f.file_name}</span>
                    <span style="color:#64748B;font-size:12px;margin-left:8px;">${ext} &middot; ${size}</span>
                  </td>
                  <td style="text-align:right;vertical-align:middle;">
                    <a href="${fileUrl}" style="background:#1A56DB;color:#fff;text-decoration:none;padding:6px 14px;border-radius:4px;font-size:13px;display:inline-block;">ダウンロード</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f6f9;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f9;padding:20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
          <tr>
            <td style="background:#1A56DB;padding:24px 32px;border-radius:8px 8px 0 0;">
              <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">${senderCompany || "SecureShare"}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <p style="color:#64748B;font-size:14px;margin:0 0 16px;">${recipientName} 様</p>
              <div style="color:#1E293B;font-size:15px;line-height:1.8;white-space:pre-wrap;margin:0 0 24px;">${message || ""}</div>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#1A56DB;font-weight:bold;font-size:15px;margin:0 0 16px;">📁 共有ファイル（${files.length}件）</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${fileRows}
                    </table>
                    <div style="text-align:center;margin-top:16px;">
                      <a href="${bulkUrl}" style="background:#0F172A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;display:inline-block;">まとめてダウンロード（ZIP）</a>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:6px;padding:12px 16px;font-size:13px;color:#713F12;margin-top:24px;">
                <strong>有効期限：</strong>${expiryDisplay}　／　<strong>DL制限：</strong>${limitDisplay}
              </div>
              <p style="margin:24px 0 0;font-size:14px;color:#475569;">${senderName || "送信者"}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#F1F5F9;padding:16px 32px;border-radius:0 0 8px 8px;font-size:12px;color:#94A3B8;text-align:center;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
              このメールは SecureShare から自動送信されています。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(
  resendApiKey: string | undefined,
  from: string,
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<boolean> {
  if (!resendApiKey) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function processExpiryWarnings(
  supabase: ReturnType<typeof createClient>,
  resendApiKey: string | undefined,
) {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("id, sender_id, subject, expires_at")
    .eq("status", "sent")
    .gt("expires_at", now.toISOString())
    .lte("expires_at", threeDaysLater.toISOString());

  if (!deliveries || deliveries.length === 0) {
    return { processed: 0 };
  }

  let notified = 0;

  for (const delivery of deliveries) {
    const expiresAt = new Date(delivery.expires_at);
    const hoursLeft = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    const daysLeft = Math.ceil(hoursLeft / 24);

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("delivery_id", delivery.id)
      .eq("type", "expiry")
      .limit(1);

    if (existing && existing.length > 0) continue;

    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("id", delivery.sender_id)
      .maybeSingle();

    if (settings && !settings.email_on_expiry) continue;

    await supabase.from("notifications").insert({
      user_id: delivery.sender_id,
      type: "expiry",
      title: "ダウンロードリンクの有効期限が近づいています",
      message: `「${delivery.subject}」の有効期限まで残り${daysLeft}日（約${hoursLeft}時間）です`,
      delivery_id: delivery.id,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", delivery.sender_id)
      .maybeSingle();

    if (profile?.email && resendApiKey) {
      const fromEmail = settings?.sender_email || "onboarding@resend.dev";
      const fromName = settings?.sender_name || "SecureShare";
      const expDateStr = `${expiresAt.getFullYear()}/${expiresAt.getMonth() + 1}/${expiresAt.getDate()}`;

      await sendEmail(
        resendApiKey,
        `${fromName} <${fromEmail}>`,
        profile.email,
        `[SecureShare] 期限切れ警告: ${delivery.subject}`,
        `「${delivery.subject}」のダウンロードリンクの有効期限が${expDateStr}に切れます（残り${daysLeft}日）。\n\n期限を延長する場合は、SecureShareの送信履歴から該当の配信を開き「期限延長」を行ってください。`,
      );
    }

    notified++;
  }

  return { processed: deliveries.length, notified };
}

async function processDailyDigest(
  supabase: ReturnType<typeof createClient>,
  resendApiKey: string | undefined,
) {
  const { data: users } = await supabase
    .from("notification_settings")
    .select("id, sender_email, sender_name")
    .eq("email_digest", true);

  if (!users || users.length === 0) {
    return { processed: 0 };
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let sent = 0;

  for (const user of users) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.email) continue;

    const { data: deliveries } = await supabase
      .from("deliveries")
      .select("id, subject, status, created_at")
      .eq("sender_id", user.id)
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false });

    const { data: downloads } = await supabase
      .from("notifications")
      .select("id, title, message, created_at")
      .eq("user_id", user.id)
      .in("type", ["download", "open"])
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false });

    const newDeliveryCount = deliveries?.length ?? 0;
    const downloadCount = downloads?.filter((d) => d.title?.includes("ダウンロード")).length ?? 0;
    const openCount = downloads?.filter((d) => d.title?.includes("開封")).length ?? 0;

    if (newDeliveryCount === 0 && downloadCount === 0 && openCount === 0) continue;

    const lines: string[] = [
      `${profile.full_name || "ユーザー"} 様`,
      "",
      "過去24時間のSecureShareアクティビティサマリーです。",
      "",
      "--- サマリー ---",
      `新規送信: ${newDeliveryCount}件`,
      `ダウンロード: ${downloadCount}件`,
      `開封: ${openCount}件`,
      "",
    ];

    if (deliveries && deliveries.length > 0) {
      lines.push("--- 新規送信 ---");
      for (const d of deliveries) {
        lines.push(`  - ${d.subject} (${d.status})`);
      }
      lines.push("");
    }

    if (downloads && downloads.length > 0) {
      lines.push("--- アクティビティ ---");
      for (const d of downloads.slice(0, 20)) {
        lines.push(`  - ${d.message}`);
      }
      lines.push("");
    }

    lines.push("SecureShare からの自動配信です。");

    const fromEmail = user.sender_email || "onboarding@resend.dev";
    const fromName = user.sender_name || "SecureShare";
    const dateStr = `${yesterday.getFullYear()}/${yesterday.getMonth() + 1}/${yesterday.getDate()}`;

    const ok = await sendEmail(
      resendApiKey,
      `${fromName} <${fromEmail}>`,
      profile.email,
      `[SecureShare] 日次ダイジェスト - ${dateStr}`,
      lines.join("\n"),
    );

    if (ok) sent++;
  }

  return { processed: users.length, sent };
}

async function processScheduledDeliveries(
  supabase: ReturnType<typeof createClient>,
  resendApiKey: string | undefined,
) {
  const now = new Date().toISOString();

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("id, sender_id, subject, message, expires_at, download_limit, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  if (!deliveries || deliveries.length === 0) {
    return { processed: 0 };
  }

  const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "") || "";
  const siteUrl = `https://ihcerkyvpjnnszpqaino.supabase.co`.replace("https://ihcerkyvpjnnszpqaino.supabase.co", "https://ihcerkyvpjnnszpqaino.supabase.co");

  let sent = 0;

  for (const delivery of deliveries) {
    const { data: recipients } = await supabase
      .from("delivery_recipients")
      .select("id, recipient_email, recipient_type, token")
      .eq("delivery_id", delivery.id);

    const { data: files } = await supabase
      .from("delivery_files")
      .select("file_name, file_size, file_extension, file_token")
      .eq("delivery_id", delivery.id);

    if (!recipients || recipients.length === 0) {
      await supabase
        .from("deliveries")
        .update({ status: "sent", scheduled_at: null })
        .eq("id", delivery.id);
      continue;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, department, email")
      .eq("id", delivery.sender_id)
      .maybeSingle();

    const { data: notifSettings } = await supabase
      .from("notification_settings")
      .select("sender_email, sender_name")
      .eq("id", delivery.sender_id)
      .maybeSingle();

    const senderName = profile?.full_name || "送信者";
    const senderCompany = profile?.department || "";
    const fromEmail = notifSettings?.sender_email || "onboarding@resend.dev";
    const fromName = notifSettings?.sender_name || "SecureShare";

    const { data: siteConfig } = await supabase
      .from("server_configs")
      .select("host")
      .eq("user_id", delivery.sender_id)
      .limit(1)
      .maybeSingle();

    const resolvedAppUrl = siteConfig?.host || "https://ihcerkyvpjnnszpqaino.supabase.co";

    if (resendApiKey) {
      for (const recipient of recipients) {
        const html = buildEmailHtml(
          delivery.subject,
          delivery.message || "",
          senderName,
          senderCompany,
          recipient.recipient_email,
          files || [],
          delivery.expires_at,
          delivery.download_limit,
          resolvedAppUrl,
          recipient.token,
        );

        const recipientName = recipient.recipient_email.split("@")[0];
        const bulkUrl = `${resolvedAppUrl}/d/${recipient.token}`;
        const fileListText = (files || [])
          .map((f, i) => `  ${i + 1}. ${f.file_name} (${f.file_extension?.toUpperCase() || "FILE"})`)
          .join("\n");

        const text = [
          `${recipientName} 様`,
          "",
          delivery.message || "",
          "",
          `共有ファイル (${files?.length ?? 0}件):`,
          fileListText,
          "",
          `まとめてダウンロード: ${bulkUrl}`,
          "",
          `有効期限: ${new Date(delivery.expires_at).toLocaleDateString("ja-JP")}`,
          delivery.download_limit ? `DL制限: ${delivery.download_limit}回` : "",
          "",
          `${senderName}`,
          senderCompany,
        ].join("\n");

        const ok = await sendEmail(
          resendApiKey,
          `${fromName} <${fromEmail}>`,
          recipient.recipient_email,
          delivery.subject,
          text,
          html,
        );

        await supabase.from("email_logs").insert({
          delivery_id: delivery.id,
          delivery_recipient_id: recipient.id,
          recipient_email: recipient.recipient_email,
          subject: delivery.subject,
          status: ok ? "sent" : "failed",
          sent_at: ok ? new Date().toISOString() : null,
          error_message: ok ? null : "Failed to send via Resend",
        });
      }
    }

    await supabase
      .from("deliveries")
      .update({ status: "sent", scheduled_at: null })
      .eq("id", delivery.id);

    await supabase.from("notifications").insert({
      user_id: delivery.sender_id,
      type: "system",
      title: "予約送信が完了しました",
      message: `「${delivery.subject}」が予約時刻に送信されました（${recipients.length}件の宛先）`,
      delivery_id: delivery.id,
    });

    sent++;
  }

  return { processed: deliveries.length, sent };
}
