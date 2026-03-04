import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, Share2, FileText, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '../lib/templates';
import type { EmailTemplate } from '../types';

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', is_shared: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await fetchTemplates(user.id);
    if (data) {
      setTemplates(data);
    } else if (error) {
      setError(error);
    }
    setLoading(false);
  };

  const openForm = (t?: EmailTemplate) => {
    if (t) {
      setEditing(t);
      setForm({ name: t.name, subject: t.subject, body: t.body, is_shared: t.is_shared });
    } else {
      setEditing(null);
      setForm({ name: '', subject: '', body: '', is_shared: false });
    }
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { data, error } = await updateTemplate(editing.id, form);
      if (data) {
        setTemplates(templates.map((t) => t.id === editing.id ? data : t));
        setShowForm(false);
      } else if (error) {
        setError(error);
      }
    } else {
      const { data, error } = await createTemplate(user.id, form);
      if (data) {
        setTemplates([data, ...templates]);
        setShowForm(false);
      } else if (error) {
        setError(error);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか?')) return;
    const { error } = await deleteTemplate(id);
    if (!error) {
      setTemplates(templates.filter((t) => t.id !== id));
    } else {
      setError(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-surface-500">{templates.length}件のテンプレート</p>
        <button onClick={() => openForm()} className="btn-primary text-sm"><Plus className="h-4 w-4" /> 新規作成</button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="h-12 w-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-600 font-medium mb-2">テンプレートがありません</p>
          <p className="text-sm text-surface-400 mb-6">よく使うメッセージをテンプレートとして保存できます</p>
          <button onClick={() => openForm()} className="btn-primary mx-auto">
            <Plus className="h-4 w-4" /> 最初のテンプレートを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const isOwned = user && t.user_id === user.id;
            return (
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
                      {!isOwned && (
                        <span className="inline-flex items-center gap-1 text-xs text-surface-400 mt-0.5">
                          他のユーザーのテンプレート
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreview(t)} className="btn-ghost p-1.5" title="プレビュー">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {isOwned && (
                      <>
                        <button onClick={() => openForm(t)} className="btn-ghost p-1.5" title="編集">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="btn-ghost p-1.5 hover:text-red-500" title="削除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-surface-500 mb-2">件名: {t.subject}</p>
                <p className="text-xs text-surface-400 line-clamp-3">{t.body}</p>
              </div>
            );
          })}
        </div>
      )}

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
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>
                キャンセル
              </button>
              <button onClick={handleSave} disabled={!form.name || !form.subject || saving} className="btn-primary">
                {saving ? '保存中...' : '保存'}
              </button>
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
