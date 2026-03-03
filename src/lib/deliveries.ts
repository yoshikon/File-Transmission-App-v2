import { supabase } from './supabase';
import type { Delivery, DeliveryFormData } from '../types';

export async function createDelivery(
  senderId: string,
  form: DeliveryFormData
): Promise<{ data: Delivery | null; error: string | null }> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + form.expiresInDays);

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .insert({
      sender_id: senderId,
      subject: form.subject,
      message: form.message,
      expires_at: expiresAt.toISOString(),
      download_limit: form.downloadLimit,
      password_protected: form.passwordProtected,
      notify_on_open: form.notifyOnOpen,
      notify_on_download: form.notifyOnDownload,
      scheduled_at: form.scheduledAt,
      status: 'sent',
    })
    .select()
    .single();

  if (deliveryError || !delivery) {
    return { data: null, error: deliveryError?.message ?? '送信データの作成に失敗しました' };
  }

  const validRecipients = form.recipients.filter((r) => r.email.includes('@'));
  if (validRecipients.length > 0) {
    const { error: recipientError } = await supabase
      .from('delivery_recipients')
      .insert(
        validRecipients.map((r) => ({
          delivery_id: delivery.id,
          recipient_email: r.email,
          recipient_type: r.type,
        }))
      );
    if (recipientError) {
      return { data: null, error: recipientError.message };
    }
  }

  if (form.files.length > 0) {
    const { error: fileError } = await supabase
      .from('delivery_files')
      .insert(
        form.files.map((f) => ({
          delivery_id: delivery.id,
          file_name: f.name,
          file_size: f.size,
          mime_type: f.type || null,
        }))
      );
    if (fileError) {
      return { data: null, error: fileError.message };
    }
  }

  const fullDelivery = await fetchDeliveryById(delivery.id);
  return { data: fullDelivery, error: null };
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const { data } = await supabase
    .from('deliveries')
    .select('*, delivery_files(*), delivery_recipients(*)')
    .order('created_at', { ascending: false });

  return (data as Delivery[]) ?? [];
}

export async function fetchDeliveryById(id: string): Promise<Delivery | null> {
  const { data } = await supabase
    .from('deliveries')
    .select('*, delivery_files(*), delivery_recipients(*)')
    .eq('id', id)
    .maybeSingle();

  return data as Delivery | null;
}
