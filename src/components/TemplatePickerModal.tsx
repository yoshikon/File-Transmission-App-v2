import { useState, useEffect } from 'react';
import { X, FileText, Search, Share2, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTemplates } from '../lib/templates';
import type { EmailTemplate } from '../types';

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: EmailTemplate) => void;
}

export default function TemplatePickerModal({ open, onClose, onSelect }: TemplatePickerModalProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    if (open && user) {
      loadTemplates();
    }
  }, [open, user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await fetchTemplates(user.id);
    if (data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleSelect = (template: EmailTemplate) => {
    onSelect(template);
    onClose();
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="card w-full max-w-3xl p-6 max-h-[85vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-800">テンプレートを選択</h3>
            <button onClick={onClose} className="btn-ghost p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="テンプレートを検索..."
              className="input-field pl-10"
              autoFocus
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-600 font-medium">
                {search ? '検索結果が見つかりません' : 'テンプレートがありません'}
              </p>
              <p className="text-sm text-surface-400 mt-1">
                {search ? '別のキーワードで検索してください' : 'テンプレートページで作成できます'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <div className="space-y-2">
                {filteredTemplates.map((t) => {
                  const isOwned = user && t.user_id === user.id;
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-surface-200 p-4 hover:bg-surface-50 hover:border-brand-300 transition-all cursor-pointer group"
                      onClick={() => handleSelect(t)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="rounded-lg bg-brand-50 p-2 shrink-0">
                            <FileText className="h-4 w-4 text-brand-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-surface-800">{t.name}</p>
                              {t.is_shared && (
                                <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                                  <Share2 className="h-3 w-3" />
                                </span>
                              )}
                              {!isOwned && (
                                <span className="text-xs text-surface-400">（共有）</span>
                              )}
                            </div>
                            <p className="text-xs text-surface-500 mb-1.5">件名: {t.subject}</p>
                            <p className="text-xs text-surface-400 line-clamp-2">{t.body}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreview(t);
                          }}
                          className="btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="プレビュー"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-800">プレビュー: {preview.name}</h3>
              <button onClick={() => setPreview(null)} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-surface-50 rounded-lg p-6">
              <p className="text-sm font-medium text-surface-800 mb-4">件名: {preview.subject}</p>
              <div className="border-t border-surface-200 pt-4">
                <p className="text-sm text-surface-700 whitespace-pre-wrap">{preview.body}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPreview(null)} className="btn-secondary">閉じる</button>
              <button onClick={() => { handleSelect(preview); setPreview(null); }} className="btn-primary">
                このテンプレートを使用
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
