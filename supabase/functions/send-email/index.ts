import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FileInfo {
  name: string;
  size: number;
  extension: string;
  file_token: string;
}

interface RecipientInfo {
  id: string;
  email: string;
  type: "to" | "cc" | "bcc";
  token: string;
}

interface SendEmailRequest {
  delivery_id: string;
  subject: string;
  message: string;
  sender_name: string;
  sender_company: string;
  files: FileInfo[];
  recipients: RecipientInfo[];
  expires_at: string;
  download_limit: number | null;
  app_url: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    pdf: "\u{1F4C4}",
    doc: "\u{1F4DD}",
    docx: "\u{1F4DD}",
    xls: "\u{1F4CA}",
    xlsx: "\u{1F4CA}",
    csv: "\u{1F4CA}",
    ppt: "\u{1F4CB}",
    pptx: "\u{1F4CB}",
    zip: "\u{1F5DC}\uFE0F",
    tar: "\u{1F5DC}\uFE0F",
    gz: "\u{1F5DC}\uFE0F",
    jpg: "\u{1F5BC}\uFE0F",
    jpeg: "\u{1F5BC}\uFE0F",
    png: "\u{1F5BC}\uFE0F",
    gif: "\u{1F5BC}\uFE0F",
    svg: "\u{1F5BC}\uFE0F",
    mp4: "\u{1F3AC}",
    mov: "\u{1F3AC}",
    mp3: "\u{1F3B5}",
    wav: "\u{1F3B5}",
    txt: "\u{1F4C4}",
  };
  return map[ext] || "\u{1F4C1}";
}

function getExtDisplay(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext ? ext.toUpperCase() : "FILE";
}

function formatExpiryDisplay(expiresAt: string): string {
  const d = new Date(expiresAt);
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}\u307E\u3067`;
}

function buildEmailHtml(
  req: SendEmailRequest,
  recipient: RecipientInfo
): string {
  const recipientName = recipient.email.split("@")[0];
  const expiryDisplay = formatExpiryDisplay(req.expires_at);
  const limitDisplay = req.download_limit
    ? `${req.download_limit}\u56DE\u307E\u3067`
    : "\u5236\u9650\u306A\u3057";
  const bulkUrl = `${req.app_url}/d/${recipient.token}`;

  const fileRows = req.files
    .map((f) => {
      const icon = getFileIcon(f.name);
      const ext = getExtDisplay(f.name);
      const size = formatFileSize(f.size);
      const fileUrl = `${req.app_url}/d/${recipient.token}/f/${f.file_token}`;
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
                      <span style="color:#1E293B;font-weight:bold;font-size:14px;">${f.name}</span>
                      <span style="color:#64748B;font-size:12px;margin-left:8px;">${ext} &middot; ${size}</span>
                    </td>
                    <td style="text-align:right;vertical-align:middle;">
                      <a href="${fileUrl}" style="background:#1A56DB;color:#fff;text-decoration:none;padding:6px 14px;border-radius:4px;font-size:13px;display:inline-block;">\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

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
              <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">${req.sender_company || "SecureShare"}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <p style="color:#64748B;font-size:14px;margin:0 0 16px;">${recipientName} \u69D8</p>
              <div style="color:#1E293B;font-size:15px;line-height:1.8;white-space:pre-wrap;margin:0 0 24px;">${req.message || ""}</div>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#1A56DB;font-weight:bold;font-size:15px;margin:0 0 16px;">\u{1F4C1} \u5171\u6709\u30D5\u30A1\u30A4\u30EB\uFF08${req.files.length}\u4EF6\uFF09</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${fileRows}
                    </table>
                    <div style="text-align:center;margin-top:16px;">
                      <a href="${bulkUrl}" style="background:#0F172A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;display:inline-block;">\u307E\u3068\u3081\u3066\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\uFF08ZIP\uFF09</a>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:6px;padding:12px 16px;font-size:13px;color:#713F12;margin-top:24px;">
                <strong>\u6709\u52B9\u671F\u9650\uFF1A</strong>${expiryDisplay}\u3000\uFF0F\u3000<strong>DL\u5236\u9650\uFF1A</strong>${limitDisplay}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#F1F5F9;padding:16px 32px;border-radius:0 0 8px 8px;font-size:12px;color:#94A3B8;text-align:center;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
              \u3053\u306E\u30E1\u30FC\u30EB\u306F SecureShare \u304B\u3089\u81EA\u52D5\u9001\u4FE1\u3055\u308C\u3066\u3044\u307E\u3059\u3002
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainText(
  req: SendEmailRequest,
  recipient: RecipientInfo
): string {
  const recipientName = recipient.email.split("@")[0];
  const indices = [
    "\u2460",
    "\u2461",
    "\u2462",
    "\u2463",
    "\u2464",
    "\u2465",
    "\u2466",
    "\u2467",
    "\u2468",
    "\u2469",
  ];
  const expiryDisplay = formatExpiryDisplay(req.expires_at);
  const limitDisplay = req.download_limit
    ? `${req.download_limit}\u56DE\u307E\u3067`
    : "\u5236\u9650\u306A\u3057";
  const bulkUrl = `${req.app_url}/d/${recipient.token}`;

  const lines = [
    `${recipientName} \u69D8`,
    "",
    req.message || "",
    "",
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
    `\u25A0 \u5171\u6709\u30D5\u30A1\u30A4\u30EB\u4E00\u89A7\uFF08${req.files.length}\u4EF6\uFF09`,
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  ];

  req.files.forEach((f, i) => {
    const fileUrl = `${req.app_url}/d/${recipient.token}/f/${f.file_token}`;
    lines.push(`${indices[i] || `(${i + 1})`} ${f.name}`);
    lines.push(
      `   \u7A2E\u5225: ${getExtDisplay(f.name)}  /  \u30B5\u30A4\u30BA: ${formatFileSize(f.size)}`
    );
    lines.push(`   \u30C0\u30A6\u30F3\u30ED\u30FC\u30C9: ${fileUrl}`);
    lines.push("");
  });

  lines.push(
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
  );
  lines.push(
    "\u25A0 \u307E\u3068\u3081\u3066\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\uFF08ZIP\uFF09"
  );
  lines.push(`  ${bulkUrl}`);
  lines.push("");
  lines.push(`\u25A0 \u6709\u52B9\u671F\u9650\uFF1A${expiryDisplay}`);
  lines.push(
    `\u25A0 \u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u5236\u9650\uFF1A${limitDisplay}`
  );
  lines.push(
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
  );
  lines.push("");
  lines.push(req.sender_name || "\u9001\u4FE1\u8005");
  lines.push(req.sender_company || "");
  lines.push("");
  lines.push(
    "\u203B \u3053\u306E\u30E1\u30FC\u30EB\u306F SecureShare \u304B\u3089\u81EA\u52D5\u9001\u4FE1\u3055\u308C\u3066\u3044\u307E\u3059\u3002"
  );

  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY is not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendEmailRequest = await req.json();

    const { data: notifSettings } = await supabase
      .from("notification_settings")
      .select("sender_email, sender_name")
      .eq("id", user.id)
      .maybeSingle();

    const fromEmail = notifSettings?.sender_email || "noreply@secureshare.app";
    const fromName = notifSettings?.sender_name || "SecureShare";

    const results: {
      recipient_email: string;
      status: string;
      resend_id?: string;
      error?: string;
    }[] = [];

    for (const recipient of body.recipients) {
      const html = buildEmailHtml(body, recipient);
      const text = buildPlainText(body, recipient);

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [recipient.email],
            subject: body.subject,
            html,
            text,
          }),
        });

        const resendData = await resendResponse.json();

        if (resendResponse.ok) {
          await supabase.from("email_logs").insert({
            delivery_id: body.delivery_id,
            delivery_recipient_id: recipient.id,
            recipient_email: recipient.email,
            subject: body.subject,
            status: "sent",
            resend_id: resendData.id,
            sent_at: new Date().toISOString(),
          });

          results.push({
            recipient_email: recipient.email,
            status: "sent",
            resend_id: resendData.id,
          });
        } else {
          const errorMsg =
            resendData.message || resendData.error || "Unknown Resend error";

          await supabase.from("email_logs").insert({
            delivery_id: body.delivery_id,
            delivery_recipient_id: recipient.id,
            recipient_email: recipient.email,
            subject: body.subject,
            status: "failed",
            error_message: errorMsg,
          });

          results.push({
            recipient_email: recipient.email,
            status: "failed",
            error: errorMsg,
          });
        }
      } catch (sendErr: unknown) {
        const errorMsg =
          sendErr instanceof Error ? sendErr.message : "Network error";

        await supabase.from("email_logs").insert({
          delivery_id: body.delivery_id,
          delivery_recipient_id: recipient.id,
          recipient_email: recipient.email,
          subject: body.subject,
          status: "failed",
          error_message: errorMsg,
        });

        results.push({
          recipient_email: recipient.email,
          status: "failed",
          error: errorMsg,
        });
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        total: results.length,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
