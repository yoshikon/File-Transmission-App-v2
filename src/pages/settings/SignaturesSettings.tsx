import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, CheckCircle2, AlertCircle, PenLine } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchSignatures, createSignature, updateSignature, deleteSignature } from '../../lib/signatures';
import type { Signature } from '../../types';

type EditorMode = { type: 'create' } | { type: 'edit'; signature: Signature };

export default function SignaturesSettings() {
  const { user } = useAuth();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [name, setName] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSignatures();
  }, [user]);

  const loadSignatures = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await fetchSignatures(user.id);
    setSignatures(data ?? []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditor({ type: 'create' });
    setName('');
    setContentHtml('');
    setError(null);
    setSaved(false);
  };

  const openEdit = (sig: Signature) => {
    setEditor({ type: 'edit', signature: sig });
    setName(sig.name);
    setContentHtml(sig.content_html);
    setError(null);
    setSaved(false);
  };

  const closeEditor = () => {
    setEditor(null);
    setError(null);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    if (editor?.type === 'create') {
      const { data, error: err } = await createSignature(user.id, {
        name: name.trim(),
        content_html: contentHtml,
      });
      if (err || !data) {
        setError(err ?? '作成に失敗しました');
        setSaving(false);
        return;
      }
      setSignatures((prev) => [data, ...prev]);
    } else if (editor?.type === 'edit') {
      const { data, error: err } = await updateSignature(editor.signature.id, {
        name: name.trim(),
        content_html: contentHtml,
      });
      if (err || !data) {
        setError(err ?? '更新に失敗しました');
        setSaving(false);
        return;
      }
      setSignatures((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      closeEditor();
    }, 1000);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    const { error: err } = await deleteSignature(id);
    if (err) {
      setDeleting(false);
      setDeleteConfirm(null);
      return;
    }
    setSignatures((prev) => prev.filter((s) => s.id !== id));
    setDeleting(false);
    setDeleteConfirm(null);
  };

  const DEFAULT_TEMPLATES = [
    {
      label: 'シンプル',
      html: '<p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">氏名<br>部署名<br>会社名<br>TEL: 000-0000-0000<br>Email: name@example.com</p>',
    },
    {
      label: 'ライン区切り',
      html: '<table style="border-collapse:collapse;font-size:13px;color:#374151;"><tr><td style="padding:0 0 4px;"><strong>氏名</strong></td></tr><tr><td style="padding:0 0 2px;border-top:2px solid #1A56DB;padding-top:6px;">部署名 ｜ 会社名</td></tr><tr><td style="padding:2px 0;">TEL: 000-0000-0000</td></tr><tr><td style="padding:2px 0;">Email: name@example.com</td></tr></table>',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">署名管理</h3>
        {!editor && (
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> 署名を追加
          </button>
        )}
      </div>

      {editor && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/10 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              {editor.type === 'create' ? '新しい署名を作成' : '署名を編集'}
            </h4>
            <button onClick={closeEditor} className="btn-ghost p-1.5 text-surface-400 hover:text-surface-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">署名名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：標準署名、英文署名"
              className="input-field"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">署名内容（HTML）</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-400 dark:text-surface-500">テンプレート：</span>
                {DEFAULT_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setContentHtml(t.html)}
                    className="text-xs px-2 py-1 rounded border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              placeholder="<p>署名のHTMLを入力してください</p>"
              rows={6}
              className="input-field resize-none font-mono text-sm"
            />
          </div>

          {contentHtml && (
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">プレビュー</p>
              <div
                className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="btn-primary text-sm"
            >
              {saving ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" /> 保存しました
              </span>
            )}
            <button onClick={closeEditor} className="btn-secondary text-sm ml-auto">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-surface-400">
          <div className="h-6 w-6 border-2 border-surface-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : signatures.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-12 text-center">
          <PenLine className="h-10 w-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
          <p className="text-surface-500 dark:text-surface-400 font-medium">署名がまだありません</p>
          <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">メール送信時に使用する署名を作成できます</p>
          <button onClick={openCreate} className="btn-secondary text-sm mt-4">
            <Plus className="h-4 w-4" /> 署名を作成
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4 hover:border-surface-300 dark:hover:border-surface-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-800 dark:text-surface-200 text-sm">{sig.name}</p>
                  <div
                    className="mt-2 text-sm text-surface-600 dark:text-surface-300 line-clamp-3 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: sig.content_html || '<span class="text-surface-400">（内容なし）</span>' }}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(sig)}
                    className="btn-ghost p-2 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400"
                    title="編集"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(sig.id)}
                    className="btn-ghost p-2 text-surface-400 hover:text-red-500 dark:hover:text-red-400"
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {deleteConfirm === sig.id && (
                <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700 flex items-center gap-3 animate-fade-in">
                  <p className="text-sm text-surface-600 dark:text-surface-300 flex-1">この署名を削除しますか？</p>
                  <button
                    onClick={() => handleDelete(sig.id)}
                    disabled={deleting}
                    className="btn-ghost text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5"
                  >
                    {deleting ? <div className="h-3.5 w-3.5 border-2 border-red-400/30 border-t-red-500 rounded-full animate-spin" /> : '削除する'}
                  </button>
                  <button onClick={() => setDeleteConfirm(null)} className="btn-ghost text-sm px-3 py-1.5">
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
