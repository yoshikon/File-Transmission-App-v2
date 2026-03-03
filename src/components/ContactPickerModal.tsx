import { useState, useEffect } from 'react';
import { X, Search, Mail, Building2, Check, Loader2, BookUser } from 'lucide-react';
import { fetchContacts } from '../lib/contacts';
import type { Contact } from '../types';

interface ContactPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emails: string[]) => void;
  alreadySelected: string[];
  singleSelect?: boolean;
}

export default function ContactPickerModal({ open, onClose, onSelect, alreadySelected, singleSelect = false }: ContactPickerModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch('');
    setLoading(true);
    fetchContacts().then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, [open]);

  if (!open) return null;

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
  });

  const toggleContact = (email: string) => {
    if (singleSelect) {
      onSelect([email]);
      onClose();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  const isAlreadyAdded = (email: string) => alreadySelected.includes(email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-xl max-h-[80vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <BookUser className="h-5 w-5 text-brand-600" />
            <h3 className="text-lg font-semibold text-surface-800">
              {singleSelect ? 'アドレス帳から選択' : 'アドレス帳から一括追加'}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-surface-400 hover:text-surface-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-surface-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・メール・会社名で検索..."
              className="input-field pl-10 py-2.5"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-surface-400 text-sm">
              {contacts.length === 0 ? 'アドレス帳にまだ連絡先がありません' : '該当する連絡先がありません'}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((c) => {
                const added = isAlreadyAdded(c.email);
                const checked = selected.has(c.email);
                return (
                  <button
                    key={c.id}
                    onClick={() => !added && toggleContact(c.email)}
                    disabled={added}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                      added
                        ? 'opacity-50 cursor-not-allowed bg-surface-50'
                        : checked
                        ? 'bg-brand-50 ring-1 ring-brand-200'
                        : 'hover:bg-surface-50'
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 text-xs font-semibold ${
                      checked ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'
                    }`}>
                      {checked ? <Check className="h-4 w-4" /> : c.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-surface-800 truncate">{c.name}</p>
                        {c.company && (
                          <span className="text-xs text-surface-400 flex items-center gap-0.5 shrink-0">
                            <Building2 className="h-3 w-3" /> {c.company}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </p>
                    </div>
                    {added && (
                      <span className="text-xs text-surface-400 shrink-0">追加済み</span>
                    )}
                    {c.tags.length > 0 && (
                      <div className="hidden sm:flex gap-1 shrink-0">
                        {c.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="badge-neutral text-[10px]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!singleSelect && (
          <div className="flex items-center justify-between p-4 border-t border-surface-200 bg-surface-50/50">
            <span className="text-sm text-surface-500">
              {selected.size > 0 ? `${selected.size}件選択中` : '連絡先を選択してください'}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">キャンセル</button>
              <button onClick={handleConfirm} disabled={selected.size === 0} className="btn-primary text-sm">
                <Check className="h-4 w-4" /> 追加する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
