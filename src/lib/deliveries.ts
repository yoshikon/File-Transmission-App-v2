import { supabase } from './supabase';
import type { Delivery, DeliveryFormData } from '../types';
import { getFileExtension } from '../utils/file-metadata';

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
      status: form.scheduledAt ? 'scheduled' : 'sent',
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
    for (const file of form.files) {
      if (!file.file) continue;

      const storagePath = `${delivery.id}/${file.id}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('delivery-files')
        .upload(storagePath, file.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return { data: null, error: `ファイルのアップロードに失敗しました: ${uploadError.message}` };
      }
    }

    const { error: fileError } = await supabase
      .from('delivery_files')
      .insert(
        form.files.map((f) => ({
          delivery_id: delivery.id,
          file_name: f.name,
          file_size: f.size,
          mime_type: f.type || null,
          file_extension: getFileExtension(f.name),
          storage_path: `${delivery.id}/${f.id}_${f.name}`,
        }))
      );
    if (fileError) {
      return { data: null, error: fileError.message };
    }
  }

  if (form.passwordProtected && form.password) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-password`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'hash',
            password: form.password,
            delivery_id: delivery.id,
          }),
        });
      }
    } catch {
      return { data: null, error: 'パスワードの保存に失敗しました' };
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
    .select('*, delivery_files(*), delivery_recipients(*, download_logs(*))')
    .eq('id', id)
    .maybeSingle();

  return data as Delivery | null;
}

export async function fetchDeliveryByToken(token: string): Promise<{
  delivery: Delivery | null;
  recipient: { id: string; recipient_email: string; download_count: number; file_download_counts: Record<string, number> } | null;
}> {
  const { data: recipientData } = await supabase
    .from('delivery_recipients')
    .select('id, delivery_id, recipient_email, download_count, file_download_counts')
    .eq('token', token)
    .maybeSingle();

  if (!recipientData) return { delivery: null, recipient: null };

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('*, delivery_files(*)')
    .eq('id', recipientData.delivery_id)
    .maybeSingle();

  return {
    delivery: delivery as Delivery | null,
    recipient: recipientData,
  };
}

export async function fetchFileByToken(deliveryToken: string, fileToken: string): Promise<{
  delivery: Delivery | null;
  file: { id: string; file_name: string; file_size: number; mime_type: string | null } | null;
  recipient: { id: string; download_count: number; file_download_counts: Record<string, number> } | null;
  error: string | null;
}> {
  const { data: recipientData } = await supabase
    .from('delivery_recipients')
    .select('id, delivery_id, download_count, file_download_counts')
    .eq('token', deliveryToken)
    .maybeSingle();

  if (!recipientData) return { delivery: null, file: null, recipient: null, error: 'INVALID_TOKEN' };

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('*')
    .eq('id', recipientData.delivery_id)
    .maybeSingle();

  if (!delivery) return { delivery: null, file: null, recipient: null, error: 'INVALID_TOKEN' };

  if (delivery.status === 'revoked') return { delivery: delivery as Delivery, file: null, recipient: null, error: 'LINK_REVOKED' };
  if (new Date(delivery.expires_at) < new Date()) return { delivery: delivery as Delivery, file: null, recipient: null, error: 'LINK_EXPIRED' };

  const { data: fileData } = await supabase
    .from('delivery_files')
    .select('id, file_name, file_size, mime_type')
    .eq('delivery_id', delivery.id)
    .eq('file_token', fileToken)
    .maybeSingle();

  if (!fileData) return { delivery: delivery as Delivery, file: null, recipient: null, error: 'INVALID_TOKEN' };

  if (delivery.download_limit) {
    const fileCount = (recipientData.file_download_counts || {})[fileData.id] || 0;
    if (fileCount >= delivery.download_limit) {
      return { delivery: delivery as Delivery, file: fileData, recipient: recipientData, error: 'DOWNLOAD_LIMIT_EXCEEDED' };
    }
  }

  return { delivery: delivery as Delivery, file: fileData, recipient: recipientData, error: null };
}

export async function recordDownload(
  recipientId: string,
  fileId: string,
  downloadType: 'individual' | 'bulk' = 'individual'
): Promise<void> {
  await supabase.from('download_logs').insert({
    delivery_recipient_id: recipientId,
    file_id: fileId,
    download_type: downloadType,
  });

  const { data: recipient } = await supabase
    .from('delivery_recipients')
    .select('download_count, file_download_counts')
    .eq('id', recipientId)
    .maybeSingle();

  if (recipient) {
    const counts = { ...(recipient.file_download_counts || {}) };
    counts[fileId] = (counts[fileId] || 0) + 1;

    await supabase
      .from('delivery_recipients')
      .update({
        download_count: recipient.download_count + 1,
        file_download_counts: counts,
        first_accessed_at: new Date().toISOString(),
      })
      .eq('id', recipientId);
  }
}

export async function revokeDelivery(deliveryId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('deliveries')
    .update({ status: 'revoked' })
    .eq('id', deliveryId);
  return { error: error?.message ?? null };
}

export async function extendDeliveryExpiry(deliveryId: string, days: number): Promise<{ error: string | null }> {
  const { data } = await supabase
    .from('deliveries')
    .select('expires_at')
    .eq('id', deliveryId)
    .maybeSingle();

  if (!data) return { error: '送信データが見つかりません' };

  const currentExpiry = new Date(data.expires_at);
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  baseDate.setDate(baseDate.getDate() + days);

  const { error } = await supabase
    .from('deliveries')
    .update({ expires_at: baseDate.toISOString(), status: 'sent' })
    .eq('id', deliveryId);

  return { error: error?.message ?? null };
}
