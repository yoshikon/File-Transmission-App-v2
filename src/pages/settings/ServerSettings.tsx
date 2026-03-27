import { useState, useEffect } from 'react';
import { Server, Plus, TestTube2, CheckCircle2, XCircle, X, Save, Trash2, Loader2, Star, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ServerConfig {
  id: string;
  user_id: string;
  name: string;
  protocol: string;
  host: string;
  port: string;
  username: string;
  upload_path: string;
  is_active: boolean;
  status: 'connected' | 'disconnected' | 'testing';
  last_tested_at: string | null;
}

const PROTOCOL_DEFAULTS: Record<string, { port: string; uploadSupported: boolean }> = {
  SMB:  { port: '445',  uploadSupported: false },
  SFTP: { port: '22',   uploadSupported: true },
  FTP:  { port: '21',   uploadSupported: true },
  NFS:  { port: '2049', uploadSupported: false },
};

export default function ServerSettings() {
  const { user } = useAuth();
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServerConfig | null>(null);
  const [form, setForm] = useState({
    name: '', protocol: 'SFTP', host: '', port: '22',
    username: '', password: '', upload_path: '/secureshare', is_active: false,
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('server_configs')
      .select('*')
      .order('created_at', { ascending: true });
    setServers((data ?? []) as ServerConfig[]);
    setLoading(false);
  };

  const openForm = (server?: ServerConfig) => {
    if (server) {
      setEditing(server);
      setForm({
        name: server.name,
        protocol: server.protocol,
        host: server.host,
        port: server.port,
        username: server.username,
        password: '',
        upload_path: server.upload_path ?? '/secureshare',
        is_active: server.is_active ?? false,
      });
    } else {
      setEditing(null);
      setForm({ name: '', protocol: 'SFTP', host: '', port: '22', username: '', password: '', upload_path: '/secureshare', is_active: false });
    }
    setShowPassword(false);
    setShowForm(true);
  };

  const handleProtocolChange = (protocol: string) => {
    const defaults = PROTOCOL_DEFAULTS[protocol] ?? { port: '22', uploadSupported: true };
    setForm((prev) => ({ ...prev, protocol, port: defaults.port }));
  };

  const handleSetActive = async (id: string) => {
    await supabase.from('server_configs').update({ is_active: false }).eq('user_id', user?.id ?? '');
    await supabase.from('server_configs').update({ is_active: true }).eq('id', id);
    setServers((prev) => prev.map((s) => ({ ...s, is_active: s.id === id })));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const updates = {
      name: form.name,
      protocol: form.protocol,
      host: form.host,
      port: form.port,
      username: form.username,
      upload_path: form.upload_path,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
      ...(form.password ? { password_enc: form.password } : {}),
    };

    if (editing) {
      const { error } = await supabase.from('server_configs').update(updates).eq('id', editing.id);
      if (!error) {
        if (form.is_active) {
          await supabase.from('server_configs').update({ is_active: false }).eq('user_id', user.id).neq('id', editing.id);
          setServers((prev) => prev.map((s) => ({
            ...s,
            is_active: s.id === editing.id ? form.is_active : false,
            ...(s.id === editing.id ? updates : {}),
          })));
        } else {
          setServers((prev) => prev.map((s) => s.id === editing.id ? { ...s, ...updates } : s));
        }
      }
    } else {
      if (form.is_active) {
        await supabase.from('server_configs').update({ is_active: false }).eq('user_id', user.id);
      }
      const { data, error } = await supabase
        .from('server_configs')
        .insert({ user_id: user.id, ...updates, status: 'disconnected' })
        .select()
        .maybeSingle();
      if (!error && data) {
        if (form.is_active) {
          setServers((prev) => [...prev.map((s) => ({ ...s, is_active: false })), data as ServerConfig]);
        } else {
          setServers((prev) => [...prev, data as ServerConfig]);
        }
      }
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('server_configs').delete().eq('id', id);
    if (!error) setServers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleTest = async (id: string) => {
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, status: 'testing' as const } : s));
    await supabase.from('server_configs').update({ status: 'testing' }).eq('id', id);

    const server = servers.find((s) => s.id === id);
    if (!server) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-server-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ host: server.host, port: parseInt(server.port, 10) || 22, protocol: server.protocol }),
      });
      const data = await res.json();
      const newStatus = data.connected ? 'connected' : 'disconnected';
      const now = new Date().toISOString();
      await supabase.from('server_configs').update({ status: newStatus, last_tested_at: now }).eq('id', id);
      setServers((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as 'connected' | 'disconnected', last_tested_at: now } : s));
    } catch {
      const now = new Date().toISOString();
      await supabase.from('server_configs').update({ status: 'disconnected', last_tested_at: now }).eq('id', id);
      setServers((prev) => prev.map((s) => s.id === id ? { ...s, status: 'disconnected', last_tested_at: now } : s));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">ファイルサーバー接続</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            FTP / SFTP サーバーに接続し、ファイル送信時に自動転送できます
          </p>
        </div>
        <button onClick={() => openForm()} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> サーバー追加
        </button>
      </div>

      {servers.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2.5">
          <Star className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            <strong>アクティブサーバー</strong>に設定したサーバーは、新規ファイル送信時にデフォルトのアップロード先として使用されます。
            対応プロトコル: <strong>SFTP</strong>、<strong>FTP</strong>（SMB / NFS は接続テストのみ対応）
          </p>
        </div>
      )}

      <div className="space-y-3">
        {servers.map((s) => {
          const uploadSupported = PROTOCOL_DEFAULTS[s.protocol]?.uploadSupported ?? false;
          return (
            <div key={s.id} className={`rounded-xl border transition-colors ${s.is_active ? 'border-brand-300 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-900/10' : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'}`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0" onClick={() => openForm(s)}>
                  <div className={`rounded-lg p-2.5 shrink-0 ${s.status === 'connected' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-surface-100 dark:bg-surface-700'}`}>
                    <Server className={`h-5 w-5 ${s.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{s.name}</p>
                      {s.is_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-[10px] font-semibold px-2 py-0.5">
                          <Star className="h-2.5 w-2.5" /> アクティブ
                        </span>
                      )}
                      {!uploadSupported && (
                        <span className="inline-flex items-center text-[10px] font-medium text-surface-400 dark:text-surface-500 rounded-full bg-surface-100 dark:bg-surface-700 px-2 py-0.5">
                          テストのみ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400 mt-0.5 flex-wrap">
                      <span className="badge-neutral">{s.protocol}</span>
                      <span>{s.host}:{s.port}</span>
                      {s.username && <span>{s.username}@</span>}
                      {s.upload_path && uploadSupported && (
                        <span className="flex items-center gap-1 text-surface-400 dark:text-surface-500">
                          <FolderOpen className="h-3 w-3" />{s.upload_path}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`hidden sm:flex items-center gap-1 text-xs font-medium ${s.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : s.status === 'testing' ? 'text-amber-500' : 'text-surface-400'}`}>
                    {s.status === 'connected' && <><CheckCircle2 className="h-3.5 w-3.5" /> 接続済</>}
                    {s.status === 'disconnected' && <><XCircle className="h-3.5 w-3.5" /> 未接続</>}
                    {s.status === 'testing' && <div className="h-3.5 w-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
                  </span>
                  {!s.is_active && uploadSupported && (
                    <button
                      onClick={() => handleSetActive(s.id)}
                      className="btn-ghost text-xs py-1.5 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400"
                      title="アクティブに設定"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleTest(s.id)}
                    disabled={s.status === 'testing'}
                    className="btn-secondary text-xs py-1.5"
                  >
                    <TestTube2 className="h-3.5 w-3.5" /> テスト
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="btn-ghost p-1.5 text-surface-400 hover:text-red-500 dark:hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {s.last_tested_at && (
                <div className="px-4 pb-3 -mt-1">
                  <p className="text-[11px] text-surface-400 dark:text-surface-500">
                    最終テスト: {new Date(s.last_tested_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {servers.length === 0 && (
          <div className="text-center py-12 text-surface-400 dark:text-surface-500">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">サーバーが登録されていません</p>
            <p className="text-xs mt-1">FTP / SFTP サーバーを追加すると、送信時にファイルを自動転送できます</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">
                {editing ? 'サーバーを編集' : '新規サーバー追加'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">サーバー名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="本社ファイルサーバー"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">プロトコル</label>
                  <select
                    value={form.protocol}
                    onChange={(e) => handleProtocolChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="SFTP">SFTP</option>
                    <option value="FTP">FTP</option>
                    <option value="SMB">SMB / CIFS</option>
                    <option value="NFS">NFS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">ポート</label>
                  <input
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">ホスト名 / IPアドレス</label>
                <input
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="192.168.1.100"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">ユーザー名</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="ftpuser"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    パスワード{editing && <span className="ml-1 text-xs text-surface-400">（変更時のみ）</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="input-field pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {PROTOCOL_DEFAULTS[form.protocol]?.uploadSupported && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    <FolderOpen className="inline h-4 w-4 mr-1 text-surface-400" />
                    アップロード先パス
                  </label>
                  <input
                    value={form.upload_path}
                    onChange={(e) => setForm({ ...form, upload_path: e.target.value })}
                    placeholder="/data/secureshare"
                    className="input-field font-mono text-sm"
                  />
                  <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                    サーバー上のファイル保存先ディレクトリ（例: /data/uploads）
                  </p>
                </div>
              )}

              {PROTOCOL_DEFAULTS[form.protocol]?.uploadSupported && (
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-surface-200 dark:border-surface-700 p-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="h-5 w-9 rounded-full bg-surface-200 peer-checked:bg-brand-600 transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-brand-500" /> アクティブサーバーとして使用
                    </p>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                      新規ファイル送信時にデフォルトのアップロード先になります
                    </p>
                  </div>
                </label>
              )}

              {!PROTOCOL_DEFAULTS[form.protocol]?.uploadSupported && (
                <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3">
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    <strong>{form.protocol}</strong> は接続テストのみ対応しています。ファイル転送には SFTP または FTP をご利用ください。
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.host || saving}
                className="btn-primary"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
