import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'download' | 'open' | 'expiry' | 'system';
  title: string;
  message: string;
  delivery_id: string | null;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(limit = 20): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as Notification[]) ?? [];
}

export async function fetchUnreadCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
}

export async function markAllAsRead(): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);
}

export async function deleteNotification(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
}
