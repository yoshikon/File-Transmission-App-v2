import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, Share2, FileText, X } from 'lucide-react';
import { mockTemplates } from '../utils/mock-data';
import type { EmailTemplate } from '../types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', is_shared: false });

  const openForm = (t?: EmailTemplate) => {
    if (t) {
      setEditing(t);
      setForm({ name: t.name, subject: t.subject, body: t.body, is_shared: t.is_shared });
    } else {
      setEditing(null);
      setForm({ name: '', subject: '', body: '', is_shared: false });
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (editing) {
      setTemplates(templates.map((t) => t.id === editing.id ? { ...t, ...form } : t));
    } else {
      setTemplates([{
        id: crypto.randomUUID(),
        user_id: 'user-1',
        name: form.name,
        subject: form.subject,
        body: form.body,
        is_shared: form.is_shared,
        created_at: new Date().toISOString(),
      }, ...templates]);
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-surface-500">{templates.length}件のテンプレート</p>
        <button onClick={() => openForm()} className="btn-primary text-sm"><Plus className="h-4 w-4" /> 新規作成</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-50 p-2">
                  <FileText className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-800">{t.name}</p>
                  {t.is_shared && (
                    <span className="inline-flex items-center gap-1 text-xs text-surface-400 mt-0.5">
                      <Share2 className="h-3 w-3" /> 共有
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setPreview(t)} className="btn-ghost p-1.5"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => openForm(t)} className="btn-ghost p-1.5"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => setTemplates(templates.filter((x) => x.id !== t.id))} className="btn-ghost p-1.5 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="text-xs text-surface-500 mb-2">件名: {t.subject}</p>
            <p className="text-xs text-surface-400 line-clamp-3">{t.body}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-800">{editing ? 'テンプレートを編集' : '新規テンプレート'}</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">テンプレート名</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ファイル送付（標準）" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">件名</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="【ファイル送付】" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">本文</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10} placeholder="メール本文..." className="input-field resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_shared} onChange={(e) => setForm({ ...form, is_shared: e.target.checked })} className="rounded border-surface-300 text-brand-600" />
                <span className="text-sm text-surface-700">全スタッフと共有</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
              <button onClick={handleSave} disabled={!form.name || !form.subject} className="btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-800">プレビュー: {preview.name}</h3>
              <button onClick={() => setPreview(null)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="bg-surface-50 rounded-lg p-6">
              <p className="text-sm font-medium text-surface-800 mb-4">件名: {preview.subject}</p>
              <div className="border-t border-surface-200 pt-4">
                <p className="text-sm text-surface-700 whitespace-pre-wrap">{preview.body}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
