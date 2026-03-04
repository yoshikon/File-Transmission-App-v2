import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ZipWriter } from 'https://deno.land/x/zipjs@v2.7.34/index.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeliveryFile {
  id: string;
  file_name: string;
  file_size: number;
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

class BlobWriter {
  private chunks: Uint8Array[] = [];

  async writeUint8Array(array: Uint8Array) {
    this.chunks.push(array);
  }

  getData() {
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return new Blob([result], { type: 'application/zip' });
  }
}

class BlobReader {
  private blob: Blob;
  private size: number;

  constructor(blob: Blob) {
    this.blob = blob;
    this.size = blob.size;
  }

  async init() {
    this.size = this.blob.size;
  }

  async readUint8Array(offset: number, length: number) {
    const slice = this.blob.slice(offset, offset + length);
    const buffer = await slice.arrayBuffer();
    return new Uint8Array(buffer);
  }
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
    // best-effort
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

    if (!deliveryToken) {
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

    const { data: filesData } = await supabase
      .from('delivery_files')
      .select('id, file_name, file_size, storage_path')
      .eq('delivery_id', deliveryTyped.id)
      .order('created_at', { ascending: true });

    if (!filesData || filesData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const files = filesData as DeliveryFile[];
    const recipient = recipientData as Recipient;

    const blobWriter = new BlobWriter();
    const zipWriter = new ZipWriter(blobWriter);

    for (const file of files) {
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('delivery-files')
        .download(file.storage_path);

      if (downloadError || !fileBlob) {
        console.error(`Failed to download file ${file.file_name}:`, downloadError);
        continue;
      }

      const blobReader = new BlobReader(fileBlob);
      await blobReader.init();

      await zipWriter.add(file.file_name, blobReader);

      await supabase.from('download_logs').insert({
        delivery_recipient_id: recipient.id,
        file_id: file.id,
        download_type: 'bulk',
      });

      const counts = { ...(recipient.file_download_counts || {}) };
      counts[file.id] = (counts[file.id] || 0) + 1;

      await supabase
        .from('delivery_recipients')
        .update({
          download_count: recipient.download_count + 1,
          file_download_counts: counts,
          first_accessed_at: new Date().toISOString(),
        })
        .eq('id', recipient.id);
    }

    await zipWriter.close();
    const zipBlob = blobWriter.getData();

    const recipientEmail = recipientData.recipient_email || 'unknown';
    const isFirstAccess = !recipientData.first_accessed_at;
    const fileNames = files.map((f) => f.file_name).join(', ');

    if (deliveryTyped.notify_on_download) {
      await supabase.from('notifications').insert({
        user_id: deliveryTyped.sender_id,
        type: 'download',
        title: 'ファイルが一括ダウンロードされました',
        message: `${recipientEmail} が「${deliveryTyped.subject}」の全ファイルをZIPでダウンロードしました`,
        delivery_id: deliveryTyped.id,
      });
      await sendNotificationEmail(supabase, deliveryTyped.sender_id, 'email_on_download',
        `[SecureShare] 一括ダウンロード通知: ${deliveryTyped.subject}`,
        `${recipientEmail} が「${deliveryTyped.subject}」の全ファイル (${fileNames}) をZIPで一括ダウンロードしました。`
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

    const zipFilename = `${deliveryTyped.subject.replace(/[^a-zA-Z0-9-_]/g, '_')}_files.zip`;

    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
      },
    });
  } catch (error) {
    console.error('ZIP download error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
