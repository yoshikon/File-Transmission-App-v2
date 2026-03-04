import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeliveryFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
}

interface Delivery {
  id: string;
  sender_id: string;
  subject: string;
  status: string;
  expires_at: string;
  download_limit: number | null;
  password_protected: boolean;
  password_hash: string | null;
  notify_on_open: boolean;
  notify_on_download: boolean;
}

interface Recipient {
  id: string;
  download_count: number;
  file_download_counts: Record<string, number> | null;
}

async function sendNotificationEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  settingKey: string,
  subject: string,
  body: string,
) {
  try {
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!settings || !(settings as Record<string, unknown>)[settingKey]) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.email) return;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) return;

    const fromEmail = settings.sender_email || 'onboarding@resend.dev';
    const fromName = settings.sender_name || 'SecureShare';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [profile.email],
        subject,
        text: body,
      }),
    });
  } catch {
    // Notification email is best-effort
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const deliveryToken = url.searchParams.get('delivery_token');
    const fileToken = url.searchParams.get('file_token');

    if (!deliveryToken || !fileToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: recipientData } = await supabase
      .from('delivery_recipients')
      .select('id, delivery_id, download_count, file_download_counts, recipient_email, first_accessed_at')
      .eq('token', deliveryToken)
      .maybeSingle();

    if (!recipientData) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: delivery } = await supabase
      .from('deliveries')
      .select('id, sender_id, subject, status, expires_at, download_limit, password_protected, password_hash, notify_on_open, notify_on_download')
      .eq('id', recipientData.delivery_id)
      .maybeSingle();

    if (!delivery) {
      return new Response(
        JSON.stringify({ error: 'Delivery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deliveryTyped = delivery as Delivery;

    if (deliveryTyped.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Link revoked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(deliveryTyped.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (deliveryTyped.password_protected && deliveryTyped.password_hash) {
      const passwordHeader = req.headers.get('X-Download-Password');
      if (!passwordHeader) {
        return new Response(
          JSON.stringify({ error: 'Password required', code: 'PASSWORD_REQUIRED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const [salt, storedHash] = deliveryTyped.password_hash.split(':');
      const encoder = new TextEncoder();
      const data = encoder.encode(salt + passwordHeader);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const inputHash = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
      if (inputHash !== storedHash) {
        return new Response(
          JSON.stringify({ error: 'Invalid password', code: 'INVALID_PASSWORD' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: fileData } = await supabase
      .from('delivery_files')
      .select('id, file_name, file_size, mime_type, storage_path')
      .eq('delivery_id', deliveryTyped.id)
      .eq('file_token', fileToken)
      .maybeSingle();

    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const file = fileData as DeliveryFile;
    const recipient = recipientData as Recipient;

    if (deliveryTyped.download_limit) {
      const fileCount = (recipient.file_download_counts || {})[file.id] || 0;
      if (fileCount >= deliveryTyped.download_limit) {
        return new Response(
          JSON.stringify({ error: 'Download limit exceeded' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('delivery-files')
      .download(file.storage_path);

    if (downloadError || !fileBlob) {
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('download_logs').insert({
      delivery_recipient_id: recipient.id,
      file_id: file.id,
      download_type: 'individual',
    });

    const counts = { ...(recipient.file_download_counts || {}) };
    counts[file.id] = (counts[file.id] || 0) + 1;
    const isFirstAccess = !recipientData.first_accessed_at;

    await supabase
      .from('delivery_recipients')
      .update({
        download_count: recipient.download_count + 1,
        file_download_counts: counts,
        first_accessed_at: new Date().toISOString(),
      })
      .eq('id', recipient.id);

    const recipientEmail = recipientData.recipient_email || 'unknown';

    if (deliveryTyped.notify_on_download) {
      await supabase.from('notifications').insert({
        user_id: deliveryTyped.sender_id,
        type: 'download',
        title: 'ファイルがダウンロードされました',
        message: `${recipientEmail} が「${deliveryTyped.subject}」の ${file.file_name} をダウンロードしました`,
        delivery_id: deliveryTyped.id,
      });
      await sendNotificationEmail(supabase, deliveryTyped.sender_id, 'email_on_download',
        `[SecureShare] ダウンロード通知: ${deliveryTyped.subject}`,
        `${recipientEmail} が「${deliveryTyped.subject}」の ${file.file_name} をダウンロードしました。`
      );
    }

    if (isFirstAccess && deliveryTyped.notify_on_open) {
      await supabase.from('notifications').insert({
        user_id: deliveryTyped.sender_id,
        type: 'open',
        title: 'リンクが開封されました',
        message: `${recipientEmail} が「${deliveryTyped.subject}」を初めて開きました`,
        delivery_id: deliveryTyped.id,
      });
      await sendNotificationEmail(supabase, deliveryTyped.sender_id, 'email_on_open',
        `[SecureShare] 開封通知: ${deliveryTyped.subject}`,
        `${recipientEmail} が「${deliveryTyped.subject}」のダウンロードリンクを初めて開きました。`
      );
    }

    return new Response(fileBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.file_name)}"`,
        'Content-Length': file.file_size.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
