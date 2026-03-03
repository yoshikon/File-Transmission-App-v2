import { useState } from 'react';
import { Server, Plus, TestTube2, CheckCircle2, XCircle, X, Save, Trash2 } from 'lucide-react';

interface ServerConfig {
  id: string;
  name: string;
  protocol: string;
  host: string;
  port: string;
  username: string;
  status: 'connected' | 'disconnected' | 'testing';
}

const initialServers: ServerConfig[] = [
  { id: '1', name: '本社ファイルサーバー', protocol: 'SMB', host: '192.168.1.100', port: '445', username: 'admin', status: 'connected' },
  { id: '2', name: 'NAS（営業部）', protocol: 'SMB', host: '192.168.1.200', port: '445', username: 'sales', status: 'connected' },
  { id: '3', name: '開発サーバー', protocol: 'SFTP', host: 'dev.company.co.jp', port: '22', username: 'deploy', status: 'disconnected' },
];

export default function ServerSettings() {
  const [servers, setServers] = useState<ServerConfig[]>(initialServers);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServerConfig | null>(null);
  const [form, setForm] = useState({ name: '', protocol: 'SMB', host: '', port: '445', username: '', password: '' });

  const openForm = (server?: ServerConfig) => {
    if (server) {
      setEditing(server);
      setForm({ name: server.name, protocol: server.protocol, host: server.host, port: server.port, username: server.username, password: '' });
    } else {
      setEditing(null);
      setForm({ name: '', protocol: 'SMB', host: '', port: '445', username: '', password: '' });
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (editing) {
      setServers(servers.map((s) =>
        s.id === editing.id ? { ...s, name: form.name, protocol: form.protocol, host: form.host, port: form.port, username: form.username } : s
      ));
    } else {
      setServers([...servers, {
        id: crypto.randomUUID(),
        name: form.name,
        protocol: form.protocol,
        host: form.host,
        port: form.port,
        username: form.username,
        status: 'disconnected',
      }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setServers(servers.filter((s) => s.id !== id));
  };

  const handleTest = async (id: string) => {
    setServers(servers.map((s) => s.id === id ? { ...s, status: 'testing' as const } : s));
    await new Promise((r) => setTimeout(r, 2000));
    setServers(servers.map((s) =>
      s.id === id ? { ...s, status: Math.random() > 0.3 ? 'connected' as const : 'disconnected' as const } : s
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-800">ファイルサーバー接続</h3>
        <button onClick={() => openForm()} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> サーバー追加
        </button>
      </div>
      <div className="space-y-3">
        {servers.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors">
            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => openForm(s)}>
              <div className={`rounded-lg p-2.5 ${s.status === 'connected' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <Server className={`h-5 w-5 ${s.status === 'connected' ? 'text-emerald-600' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-800">{s.name}</p>
                <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                  <span className="badge-neutral">{s.protocol}</span>
                  <span>{s.host}:{s.port}</span>
                  <span>{s.username}@</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs font-medium ${s.status === 'connected' ? 'text-emerald-600' : s.status === 'testing' ? 'text-amber-600' : 'text-red-500'}`}>
                {s.status === 'connected' && <><CheckCircle2 className="h-3.5 w-3.5" /> 接続中</>}
                {s.status === 'disconnected' && <><XCircle className="h-3.5 w-3.5" /> 未接続</>}
                {s.status === 'testing' && <div className="h-3.5 w-3.5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />}
              </span>
              <button onClick={() => handleTest(s.id)} disabled={s.status === 'testing'} className="btn-secondary text-xs py-1.5">
                <TestTube2 className="h-3.5 w-3.5" /> テスト
              </button>
              <button onClick={() => handleDelete(s.id)} className="btn-ghost p-1.5 text-surface-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {servers.length === 0 && (
          <div className="text-center py-12 text-surface-400">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">サーバーが登録されていません</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-800">{editing ? 'サーバーを編集' : '新規サーバー追加'}</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">サーバー名</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="本社ファイルサーバー" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">プロトコル</label>
                  <select value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })} className="input-field">
                    <option value="SMB">SMB / CIFS</option>
                    <option value="SFTP">SFTP</option>
                    <option value="FTP">FTP</option>
                    <option value="NFS">NFS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">ポート</label>
                  <input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">ホスト名 / IPアドレス</label>
                <input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.100" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">ユーザー名</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">パスワード</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
              <button onClick={handleSave} disabled={!form.name || !form.host} className="btn-primary">
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
