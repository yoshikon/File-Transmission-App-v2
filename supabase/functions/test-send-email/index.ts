import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatExpiryDisplay(expiresAt: string): string {
  const d = new Date(expiresAt);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}まで`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = "89fe1836-5df2-4b70-ae3d-ac937597d280";
    const deliveryId = "9e391b69-82f4-42d5-84b4-2d7a305373f2";
    const recipientId = "c2fa7f6c-5202-42ca-9353-6aabab76670a";
    const recipientEmail = "konno@studio-a.co.jp";
    const recipientToken = "b7568af2-8295-4d2f-8aaf-3fb4fa07f9d6";
    const fileToken = "0e9e510b-36f2-4a8c-87c8-1c762a5ab26c";
    const fileName = "test-document.pdf";
    const fileSize = 102400;
    const appUrl = "https://ihcerkyvpjnnszpqaino.supabase.co";
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: notifSettings } = await supabase
      .from("notification_settings")
      .select("sender_email, sender_name")
      .eq("id", userId)
      .maybeSingle();

    const fromEmail = notifSettings?.sender_email || "onboarding@resend.dev";
    const fromName = notifSettings?.sender_name || "SecureShare";

    const fileUrl = `${appUrl}/d/${recipientToken}/f/${fileToken}`;
    const bulkUrl = `${appUrl}/d/${recipientToken}`;
    const expiryDisplay = formatExpiryDisplay(expiresAt);
    const sizeDisplay = formatFileSize(fileSize);

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;padding:20px;">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr><td style="background:#1A56DB;padding:24px 32px;border-radius:8px 8px 0 0;">
      <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">Studio-A</p>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;border:1px solid #e2e8f0;">
      <p style="color:#64748B;">konno 様</p>
      <p>こちらはドメインメールアドレス変更後のテスト送信です。</p>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:20px;margin-top:24px;">
        <p style="color:#1A56DB;font-weight:bold;">共有ファイル（1件）</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:#fff;border:1px solid #DBEAFE;border-radius:6px;padding:12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>📄 <strong>${fileName}</strong> <span style="color:#64748B;font-size:12px;">PDF · ${sizeDisplay}</span></td>
                <td style="text-align:right;"><a href="${fileUrl}" style="background:#1A56DB;color:#fff;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:13px;">ダウンロード</a></td>
              </tr>
            </table>
          </td></tr>
        </table>
        <div style="text-align:center;margin-top:16px;">
          <a href="${bulkUrl}" style="background:#0F172A;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">まとめてダウンロード（ZIP）</a>
        </div>
      </div>
      <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:6px;padding:12px;margin-top:24px;font-size:13px;color:#713F12;">
        <strong>有効期限：</strong>${expiryDisplay}　／　<strong>DL制限：</strong>制限なし
      </div>
    </td></tr>
    <tr><td style="background:#F1F5F9;padding:16px 32px;border-radius:0 0 8px 8px;font-size:12px;color:#94A3B8;text-align:center;border:1px solid #e2e8f0;border-top:none;">
      このメールは SecureShare から自動送信されています。
    </td></tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipientEmail],
        subject: "【テスト】ドメインメールアドレス変更後の送信確認",
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (resendResponse.ok) {
      await supabase.from("email_logs").insert({
        delivery_id: deliveryId,
        delivery_recipient_id: recipientId,
        recipient_email: recipientEmail,
        subject: "【テスト】ドメインメールアドレス変更後の送信確認",
        status: "sent",
        resend_id: resendData.id,
        sent_at: new Date().toISOString(),
      });

      await supabase.from("deliveries").update({ status: "sent" }).eq("id", deliveryId);

      return new Response(JSON.stringify({
        success: true,
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        resend_id: resendData.id,
        message: "メール送信成功",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await supabase.from("email_logs").insert({
        delivery_id: deliveryId,
        delivery_recipient_id: recipientId,
        recipient_email: recipientEmail,
        subject: "【テスト】ドメインメールアドレス変更後の送信確認",
        status: "failed",
        error_message: resendData.message || resendData.error || "Unknown error",
      });

      return new Response(JSON.stringify({
        success: false,
        error: resendData.message || resendData.error,
        resend_response: resendData,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
