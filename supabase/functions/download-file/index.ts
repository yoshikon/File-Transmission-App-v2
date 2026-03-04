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
  status: string;
  expires_at: string;
  download_limit: number | null;
  password_protected: boolean;
}

interface Recipient {
  id: string;
  download_count: number;
  file_download_counts: Record<string, number> | null;
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
      .select('id, delivery_id, download_count, file_download_counts')
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
      .select('id, status, expires_at, download_limit, password_protected')
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

    await supabase
      .from('delivery_recipients')
      .update({
        download_count: recipient.download_count + 1,
        file_download_counts: counts,
        first_accessed_at: new Date().toISOString(),
      })
      .eq('id', recipient.id);

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
