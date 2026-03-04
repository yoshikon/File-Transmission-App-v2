import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Upload, Download, Mail, Building2, Tag, CreditCard as Edit2, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchContacts, createContact, updateContact, deleteContact } from '../lib/contacts';
import { useAuth } from '../contexts/AuthContext';
import type { Contact } from '../types';

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', tags: '' });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const data = await fetchContacts();
    setContacts(data);
    setLoading(false);
  };

  const allTags = [...new Set(contacts.flatMap((c) => c.tags))];

  const filtered = contacts.filter((c) => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());
    const matchTag = !selectedTag || c.tags.includes(selectedTag);
    return matchSearch && matchTag;
  });

  const openForm = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setForm({ name: contact.name, email: contact.email, company: contact.company || '', tags: contact.tags.join(', ') });
    } else {
      setEditingContact(null);
      setForm({ name: '', email: '', company: '', tags: '' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingContact) {
      const { error } = await updateContact(editingContact.id, {
        name: form.name,
        email: form.email,
        company: form.company,
        tags,
      });
      if (!error) {
        setContacts(contacts.map((c) =>
          c.id === editingContact.id
            ? { ...c, name: form.name, email: form.email, company: form.company || null, tags }
            : c
        ));
      }
    } else {
      const { data } = await createContact(user.id, {
        name: form.name,
        email: form.email,
        company: form.company,
        tags,
      });
      if (data) {
        setContacts([data, ...contacts]);
      }
    }

    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteContact(id);
    if (!error) {
      setContacts(contacts.filter((c) => c.id !== id));
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setImportResult({ type: 'error', msg: 'CSVにデータ行がありません' });
        setImporting(false);
        return;
      }

      const header = lines[0].toLowerCase();
      const cols = parseCsvLine(header);
      const nameIdx = cols.findIndex((c) => c.includes('名前') || c.includes('name') || c === '氏名');
      const emailIdx = cols.findIndex((c) => c.includes('mail') || c.includes('メール') || c.includes('email'));
      const companyIdx = cols.findIndex((c) => c.includes('会社') || c.includes('company') || c.includes('組織'));
      const tagsIdx = cols.findIndex((c) => c.includes('tag') || c.includes('タグ'));

      if (emailIdx === -1) {
        setImportResult({ type: 'error', msg: 'メールアドレス列が見つかりません。ヘッダーに "email" または "メール" を含めてください。' });
        setImporting(false);
        return;
      }

      let imported = 0;
      const existingEmails = new Set(contacts.map((c) => c.email.toLowerCase()));

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i]);
        const email = vals[emailIdx]?.trim();
        if (!email || !email.includes('@')) continue;
        if (existingEmails.has(email.toLowerCase())) continue;

        const name = (nameIdx >= 0 ? vals[nameIdx]?.trim() : '') || email.split('@')[0];
        const company = companyIdx >= 0 ? vals[companyIdx]?.trim() || '' : '';
        const tags = tagsIdx >= 0 ? vals[tagsIdx]?.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [];

        const { data } = await createContact(user.id, { name, email, company, tags });
        if (data) {
          existingEmails.add(email.toLowerCase());
          imported++;
        }
      }

      setImportResult({ type: 'success', msg: `${imported}件の連絡先をインポートしました` });
      await loadContacts();
    } catch {
      setImportResult({ type: 'error', msg: 'CSVの読み込みに失敗しました' });
    } finally {
      setImporting(false);
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  const handleExport = () => {
    if (contacts.length === 0) return;
    const header = '名前,メールアドレス,会社名,タグ';
    const rows = contacts.map((c) => {
      const name = escapeCsvField(c.name);
      const email = escapeCsvField(c.email);
      const company = escapeCsvField(c.company || '');
      const tags = escapeCsvField(c.tags.join('; '));
      return `${name},${email},${company},${tags}`;
    });
    const bom = '\uFEFF';
    const csv = bom + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 dark:text-surface-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="名前・メール・会社名で検索..." className="input-field pl-10 py-2" />
        </div>
        <div className="flex items-center gap-2">
          <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          <button onClick={() => csvInputRef.current?.click()} disabled={importing} className="btn-secondary text-sm">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'インポート中...' : 'CSVインポート'}
          </button>
          <button onClick={handleExport} disabled={contacts.length === 0} className="btn-secondary text-sm"><Download className="h-4 w-4" /> エクスポート</button>
          <button onClick={() => openForm()} className="btn-primary text-sm"><Plus className="h-4 w-4" /> 新規追加</button>
        </div>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm animate-slide-up ${
          importResult.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
        }`}>
          {importResult.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {importResult.msg}
        </div>
      )}

      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-4 w-4 text-surface-400 dark:text-surface-500" />
          <button onClick={() => setSelectedTag('')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedTag ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600'}`}>
            すべて
          </button>
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === tag ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600'}`}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20">
          <Mail className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <p className="text-surface-500 dark:text-surface-400 mb-2">アドレス帳にまだ連絡先がありません</p>
          <button onClick={() => openForm()} className="btn-primary text-sm mt-2">
            <Plus className="h-4 w-4" /> 最初の連絡先を追加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold text-sm">
                    {c.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{c.name}</p>
                    {c.company && (
                      <p className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" /> {c.company}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openForm(c)} className="btn-ghost p-1.5"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(c.id)} className="btn-ghost p-1.5 hover:text-red-500 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-300 flex items-center gap-1.5 mb-2">
                <Mail className="h-3.5 w-3.5 text-surface-400 dark:text-surface-500" /> {c.email}
              </p>
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((tag) => (
                    <span key={tag} className="badge-neutral text-xs">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">{editingContact ? '連絡先を編集' : '新規連絡先'}</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">氏名</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="田中 太郎" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">メールアドレス</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">会社名</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="株式会社サンプル" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">タグ（カンマ区切り）</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="営業, VIP" className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
              <button onClick={handleSave} disabled={!form.name || !form.email || saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
