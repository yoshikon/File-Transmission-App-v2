import { supabase } from './supabase';
import type { AuditLog } from '../types';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.signup'
  | 'user.password_change'
  | 'delivery.create'
  | 'delivery.revoke'
  | 'delivery.extend_expiry'
  | 'delivery.schedule'
  | 'file.upload'
  | 'file.download'
  | 'template.create'
  | 'template.update'
  | 'template.delete'
  | 'signature.create'
  | 'signature.update'
  | 'signature.delete'
  | 'contact.create'
  | 'contact.delete';

export async function writeAuditLog(
  action: AuditAction,
  resource: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/write-audit-log`;
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, resource, details: details ?? null }),
    });
  } catch {
  }
}

export interface AuditLogFilters {
  action?: string;
  resource?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function fetchAuditLogs(
  filters: AuditLogFilters = {},
  page = 0,
  pageSize = 50,
): Promise<{ data: (AuditLog & { profiles?: { full_name: string; email: string } | null })[]; count: number }> {
  let query = supabase
    .from('audit_logs')
    .select('*, profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.resource) {
    query = query.ilike('resource', `%${filters.resource}%`);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, count } = await query;

  return { data: (data ?? []) as (AuditLog & { profiles?: { full_name: string; email: string } | null })[], count: count ?? 0 };
}

export const ACTION_LABELS: Record<string, string> = {
  'user.login': 'ログイン',
  'user.logout': 'ログアウト',
  'user.signup': 'アカウント作成',
  'user.password_change': 'パスワード変更',
  'delivery.create': '送信作成',
  'delivery.revoke': '送信取り消し',
  'delivery.extend_expiry': '有効期限延長',
  'delivery.schedule': '予約送信',
  'file.upload': 'ファイルアップロード',
  'file.download': 'ファイルダウンロード',
  'template.create': 'テンプレート作成',
  'template.update': 'テンプレート更新',
  'template.delete': 'テンプレート削除',
  'signature.create': '署名作成',
  'signature.update': '署名更新',
  'signature.delete': '署名削除',
  'contact.create': '連絡先追加',
  'contact.delete': '連絡先削除',
};

export const ACTION_CATEGORIES: Record<string, string[]> = {
  'ユーザー': ['user.login', 'user.logout', 'user.signup', 'user.password_change'],
  '送信': ['delivery.create', 'delivery.revoke', 'delivery.extend_expiry', 'delivery.schedule'],
  'ファイル': ['file.upload', 'file.download'],
  'テンプレート': ['template.create', 'template.update', 'template.delete'],
  '署名': ['signature.create', 'signature.update', 'signature.delete'],
  '連絡先': ['contact.create', 'contact.delete'],
};
