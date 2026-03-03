import { supabase } from './supabase';
import type { Delivery } from '../types';

export interface EmailSendResult {
  total: number;
  sent: number;
  failed: number;
  results: {
    recipient_email: string;
    status: 'sent' | 'failed';
    resend_id?: string;
    error?: string;
  }[];
}

export async function sendDeliveryEmails(
  delivery: Delivery,
  senderName: string,
  senderCompany: string,
  appUrl: string,
): Promise<EmailSendResult> {
  const recipients = delivery.delivery_recipients ?? [];
  const files = delivery.delivery_files ?? [];

  if (recipients.length === 0) {
    return { total: 0, sent: 0, failed: 0, results: [] };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('認証セッションが見つかりません');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      delivery_id: delivery.id,
      subject: delivery.subject,
      message: delivery.message,
      sender_name: senderName,
      sender_company: senderCompany,
      files: files.map((f) => ({
        name: f.file_name,
        size: f.file_size,
        extension: f.file_extension,
        file_token: f.file_token,
      })),
      recipients: recipients.map((r) => ({
        id: r.id,
        email: r.recipient_email,
        type: r.recipient_type,
        token: r.token,
      })),
      expires_at: delivery.expires_at,
      download_limit: delivery.download_limit,
      app_url: appUrl,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'メール送信に失敗しました' }));
    throw new Error(err.error || 'メール送信に失敗しました');
  }

  return response.json();
}

export async function fetchEmailLogs(deliveryId: string) {
  const { data } = await supabase
    .from('email_logs')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('created_at', { ascending: false });

  return data ?? [];
}
