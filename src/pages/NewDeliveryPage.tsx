import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Paperclip, MessageSquare, Settings2, CheckCircle2,
  Plus, X, Upload, FileText, Image, FileSpreadsheet, File,
  Calendar, Lock, Bell, Eye, Send, ArrowLeft, ArrowRight, Trash2,
  AlertCircle, BookUser, Link2, Copy, Mail,
} from 'lucide-react';
import { formatFileSize } from '../utils/format';
import { buildDownloadUrl, getFileIcon as getEmojiIcon, getExtensionDisplay } from '../utils/file-metadata';
import { useAuth } from '../contexts/AuthContext';
import { createDelivery } from '../lib/deliveries';
import ContactPickerModal from '../components/ContactPickerModal';
import EmailPreview from '../components/EmailPreview';
import type { Delivery, DeliveryFormData, RecipientType, DeliveryFile } from '../types';

const steps = [
  { id: 1, label: '宛先設定', icon: Users },
  { id: 2, label: 'ファイル選択', icon: Paperclip },
  { id: 3, label: 'メッセージ作成', icon: MessageSquare },
  { id: 4, label: '配信オプション', icon: Settings2 },
  { id: 5, label: 'プレビュー', icon: Eye },
  { id: 6, label: '確認・送信', icon: CheckCircle2 },
];

function getFileTypeIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText className="h-5 w-5 text-red-500" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return <Image className="h-5 w-5 text-teal-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  return <File className="h-5 w-5 text-surface-400" />;
}

export default function NewDeliveryPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [sentDelivery, setSentDelivery] = useState<Delivery | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState('');
  const [copiedFileUrl, setCopiedFileUrl] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactPickerTarget, setContactPickerTarget] = useState<number | null>(null);

  const [form, setForm] = useState<DeliveryFormData>({
    recipients: [{ email: '', type: 'to' as RecipientType }],
    files: [],
    subject: '',
    message: '',
    signatureId: null,
    templateId: null,
    expiresInDays: 7,
    downloadLimit: null,
    passwordProtected: false,
    password: '',
    notifyOnOpen: true,
    notifyOnDownload: true,
    scheduledAt: null,
  });

  const updateField = <K extends keyof DeliveryFormData>(key: K, value: DeliveryFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addRecipient = (type: RecipientType) => {
    updateField('recipients', [...form.recipients, { email: '', type }]);
  };

  const removeRecipient = (index: number) => {
    updateField('recipients', form.recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, email: string) => {
    const updated = [...form.recipients];
    updated[index] = { ...updated[index], email };
    updateField('recipients', updated);
  };

  const handleContactSelect = (emails: string[]) => {
    const existing = new Set(form.recipients.map((r) => r.email));
    const newRecipients = emails
      .filter((e) => !existing.has(e))
      .map((email) => ({ email, type: 'to' as RecipientType }));
    const current = form.recipients.filter((r) => r.email);
    const empty = form.recipients.filter((r) => !r.email);
    if (current.length === 0 && empty.length > 0 && newRecipients.length > 0) {
      updateField('recipients', newRecipients);
    } else {
      updateField('recipients', [...current, ...newRecipients, ...empty.slice(0, empty.length > 0 && newRecipients.length > 0 ? 0 : empty.length)]);
    }
  };

  const handleRowContactSelect = (emails: string[]) => {
    if (contactPickerTarget === null || emails.length === 0) return;
    updateRecipient(contactPickerTarget, emails[0]);
    setContactPickerTarget(null);
  };

  const openRowContactPicker = (index: number) => {
    setContactPickerTarget(index);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    updateField('files', [...form.files, ...droppedFiles]);
  }, [form.files]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    updateField('files', [...form.files, ...selected]);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    updateField('files', form.files.filter((f) => f.id !== id));
  };

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    setSendError(null);
    const { data, error } = await createDelivery(user.id, form);
    setSending(false);
    if (error) {
      setSendError(error);
    } else {
      setSentDelivery(data);
    }
  };

  const handleCopyUrl = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const handleCopyFileUrl = (deliveryToken: string, fileToken: string) => {
    const url = buildDownloadUrl(deliveryToken, fileToken);
    navigator.clipboard.writeText(url);
    setCopiedFileUrl(fileToken);
    setTimeout(() => setCopiedFileUrl(''), 2000);
  };

  const totalSize = form.files.reduce((sum, f) => sum + f.size, 0);
  const expiresAt = new Date(Date.now() + form.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const canProceed = () => {
    if (step === 1) return form.recipients.some((r) => r.email.includes('@'));
    if (step === 2) return form.files.length > 0;
    if (step === 3) return form.subject.trim().length > 0;
    return true;
  };

  if (sentDelivery) {
    return (
      <SendCompletionScreen
        delivery={sentDelivery}
        copiedToken={copiedToken}
        copiedFileUrl={copiedFileUrl}
        onCopyUrl={handleCopyUrl}
        onCopyFileUrl={handleCopyFileUrl}
        onViewDetail={() => navigate(`/history/${sentDelivery.id}`)}
        onNewDelivery={() => {
          setSentDelivery(null);
          setCopiedToken('');
          setCopiedFileUrl('');
          setStep(1);
          setForm({
            ...form,
            recipients: [{ email: '', type: 'to' }],
            files: [],
            subject: '',
            message: '',
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={`hidden sm:block w-6 h-px ${isDone ? 'bg-brand-400' : 'bg-surface-200'}`} />}
              <button
                onClick={() => isDone && setStep(s.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-brand-600 text-white shadow-md' : isDone ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="card p-6 lg:p-8 animate-slide-up">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-surface-800">宛先設定</h3>
            <div className="space-y-3">
              {form.recipients.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={r.type}
                    onChange={(e) => {
                      const updated = [...form.recipients];
                      updated[i] = { ...updated[i], type: e.target.value as RecipientType };
                      updateField('recipients', updated);
                    }}
                    className="input-field w-20 py-2.5"
                  >
                    <option value="to">To</option>
                    <option value="cc">CC</option>
                    <option value="bcc">BCC</option>
                  </select>
                  <input
                    type="email"
                    value={r.email}
                    onChange={(e) => updateRecipient(i, e.target.value)}
                    placeholder="email@example.com"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => openRowContactPicker(i)}
                    className="btn-ghost p-2 text-surface-400 hover:text-brand-600 shrink-0"
                    title="アドレス帳から選択"
                  >
                    <BookUser className="h-4 w-4" />
                  </button>
                  {form.recipients.length > 1 && (
                    <button onClick={() => removeRecipient(i)} className="btn-ghost p-2 text-surface-400 hover:text-red-500 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => addRecipient('to')} className="btn-ghost text-sm text-brand-600"><Plus className="h-4 w-4" /> To追加</button>
              <button onClick={() => addRecipient('cc')} className="btn-ghost text-sm text-surface-500"><Plus className="h-4 w-4" /> CC追加</button>
              <button onClick={() => addRecipient('bcc')} className="btn-ghost text-sm text-surface-500"><Plus className="h-4 w-4" /> BCC追加</button>
              <div className="h-4 w-px bg-surface-200 mx-1" />
              <button onClick={() => setShowContactPicker(true)} className="btn-secondary text-sm">
                <BookUser className="h-4 w-4" /> アドレス帳
              </button>
            </div>
            <ContactPickerModal
              open={showContactPicker}
              onClose={() => setShowContactPicker(false)}
              onSelect={handleContactSelect}
              alreadySelected={form.recipients.map((r) => r.email).filter(Boolean)}
            />
            <ContactPickerModal
              open={contactPickerTarget !== null}
              onClose={() => setContactPickerTarget(null)}
              onSelect={handleRowContactSelect}
              alreadySelected={form.recipients.map((r) => r.email).filter(Boolean)}
              singleSelect
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-surface-800">ファイル選択</h3>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-surface-300 rounded-xl p-12 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 text-surface-300 mx-auto mb-4" />
              <p className="text-surface-600 font-medium">ファイルをドラッグ&ドロップ</p>
              <p className="text-sm text-surface-400 mt-1">またはクリックして選択</p>
              <input id="file-input" type="file" multiple onChange={handleFileInput} className="hidden" />
            </div>
            {form.files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-surface-500">
                  <span>{form.files.length}ファイル選択中</span>
                  <span>合計: {formatFileSize(totalSize)}</span>
                </div>
                {form.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
                    {getFileTypeIcon(f.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{f.name}</p>
                      <p className="text-xs text-surface-400">{formatFileSize(f.size)}</p>
                    </div>
                    <button onClick={() => removeFile(f.id)} className="btn-ghost p-1.5 text-surface-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-surface-800">メッセージ作成</h3>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">件名</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="ファイル送付のご連絡"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">本文</label>
              <textarea
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="メッセージを入力してください..."
                rows={8}
                className="input-field resize-none"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-surface-800">配信オプション</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-surface-700 mb-1.5">
                  <Calendar className="h-4 w-4 text-surface-400" /> ダウンロード有効期限
                </label>
                <select value={form.expiresInDays} onChange={(e) => updateField('expiresInDays', Number(e.target.value))} className="input-field">
                  <option value={1}>1日</option>
                  <option value={3}>3日</option>
                  <option value={7}>7日</option>
                  <option value={14}>14日</option>
                  <option value={30}>30日</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">ダウンロード回数制限</label>
                <select value={form.downloadLimit ?? ''} onChange={(e) => updateField('downloadLimit', e.target.value ? Number(e.target.value) : null)} className="input-field">
                  <option value="">無制限</option>
                  <option value={1}>1回</option>
                  <option value={3}>3回</option>
                  <option value={5}>5回</option>
                  <option value={10}>10回</option>
                </select>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <ToggleOption checked={form.passwordProtected} onChange={(v) => updateField('passwordProtected', v)} icon={Lock} label="パスワード保護" />
              {form.passwordProtected && (
                <input type="text" value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="ダウンロードパスワード" className="input-field ml-14 w-auto" />
              )}
              <ToggleOption checked={form.notifyOnOpen} onChange={(v) => updateField('notifyOnOpen', v)} icon={Eye} label="開封通知" />
              <ToggleOption checked={form.notifyOnDownload} onChange={(v) => updateField('notifyOnDownload', v)} icon={Bell} label="ダウンロード通知" />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-surface-800">メールプレビュー</h3>
            <p className="text-sm text-surface-500">受信者に送信されるメールの見た目を確認できます。</p>
            <EmailPreview
              senderName={profile?.full_name || '送信者'}
              senderCompany={profile?.department || ''}
              senderEmail={profile?.email || ''}
              recipientName={form.recipients.find((r) => r.email)?.email?.split('@')[0] || '受信者'}
              message={form.message}
              files={form.files}
              expiresAt={expiresAt}
              downloadLimit={form.downloadLimit}
              subject={form.subject}
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-surface-800">送信内容の確認</h3>
            <div className="space-y-4">
              <SummaryRow label="宛先" value={form.recipients.filter((r) => r.email).map((r) => `${r.email} (${r.type.toUpperCase()})`).join(', ')} />
              <SummaryRow label="件名" value={form.subject} />
              <SummaryRow label="ファイル" value={`${form.files.length}件 (${formatFileSize(totalSize)})`} />
              <SummaryRow label="有効期限" value={`${form.expiresInDays}日間`} />
              <SummaryRow label="DL回数制限" value={form.downloadLimit ? `${form.downloadLimit}回` : '無制限'} />
              <SummaryRow label="パスワード保護" value={form.passwordProtected ? 'あり' : 'なし'} />
            </div>

            <div className="rounded-lg border border-surface-200 p-4">
              <h4 className="text-sm font-medium text-surface-700 mb-3">添付ファイル一覧</h4>
              <div className="space-y-2">
                {form.files.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">{getEmojiIcon(f.name)}</span>
                    <span className="font-medium text-surface-800">{f.name}</span>
                    <span className="text-surface-400 text-xs">{getExtensionDisplay(f.name)} · {formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            {form.message && (
              <div>
                <span className="text-sm font-medium text-surface-500">メッセージ</span>
                <p className="mt-1 text-sm text-surface-700 whitespace-pre-wrap bg-surface-50 rounded-lg p-3">{form.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/dashboard')} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? '戻る' : 'キャンセル'}
        </button>
        {step < 6 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="btn-primary">
            次へ <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={handleSend} disabled={sending} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              {sending ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> 送信する
                </>
              )}
            </button>
            {sendError && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> {sendError}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleOption({ checked, onChange, icon: Icon, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Lock;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="h-6 w-11 rounded-full bg-surface-200 peer-checked:bg-brand-600 transition-colors" />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </div>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-surface-400" />
        <span className="text-sm font-medium text-surface-700">{label}</span>
      </div>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-surface-100 last:border-0">
      <span className="text-sm font-medium text-surface-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-surface-800">{value}</span>
    </div>
  );
}

function SendCompletionScreen({
  delivery,
  copiedToken,
  copiedFileUrl,
  onCopyUrl,
  onCopyFileUrl,
  onViewDetail,
  onNewDelivery,
}: {
  delivery: Delivery;
  copiedToken: string;
  copiedFileUrl: string;
  onCopyUrl: (token: string) => void;
  onCopyFileUrl: (deliveryToken: string, fileToken: string) => void;
  onViewDetail: () => void;
  onNewDelivery: () => void;
}) {
  const recipients = delivery.delivery_recipients ?? [];
  const files = delivery.delivery_files ?? [];

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="rounded-full bg-emerald-100 p-6 mx-auto w-fit mb-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-surface-800 mb-2">送信完了</h2>
        <p className="text-surface-500">
          {recipients.length}件の宛先にダウンロードリンクを発行しました
        </p>
      </div>

      {files.length > 0 && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-surface-400" />
            ファイル別ダウンロードURL
          </h3>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={f.id} className="rounded-lg border border-surface-200 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">{getEmojiIcon(f.file_name)}</span>
                  <span className="text-sm font-medium text-surface-800 flex-1 truncate">{f.file_name}</span>
                  <span className="text-xs text-surface-400">{formatFileSize(f.file_size)}</span>
                </div>
                {recipients.map((r) => {
                  const url = buildDownloadUrl(r.token, f.file_token);
                  return (
                    <div key={r.id} className="flex items-center gap-2 ml-9 mb-1.5">
                      <span className="text-xs text-surface-500 w-40 truncate">{r.recipient_email}</span>
                      <input
                        type="text"
                        readOnly
                        value={url}
                        className="input-field text-xs font-mono text-surface-500 bg-surface-50 flex-1 py-1.5"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => onCopyFileUrl(r.token, f.file_token)}
                        className={`btn-ghost p-1.5 text-xs shrink-0 ${copiedFileUrl === f.file_token ? 'text-emerald-600' : ''}`}
                      >
                        {copiedFileUrl === f.file_token ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {recipients.length > 0 && (
        <div className="card p-6 mb-8">
          <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-surface-400" />
            一括ダウンロードURL（受信者別）
          </h3>
          <div className="space-y-3">
            {recipients.map((r) => {
              const url = `${window.location.origin}/d/${r.token}`;
              return (
                <div key={r.id} className="rounded-lg border border-surface-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-surface-400" />
                    <span className="text-sm font-medium text-surface-800">{r.recipient_email}</span>
                    <span className="badge-neutral text-xs">{r.recipient_type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="input-field text-xs font-mono text-surface-600 bg-surface-50 flex-1"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => onCopyUrl(r.token)}
                      className={`btn-secondary text-xs shrink-0 transition-colors ${
                        copiedToken === r.token ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''
                      }`}
                    >
                      {copiedToken === r.token ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> コピー済み</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> コピー</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button onClick={onViewDetail} className="btn-secondary">送信詳細を確認</button>
        <button onClick={onNewDelivery} className="btn-primary">新しい送信を作成</button>
      </div>
    </div>
  );
}
