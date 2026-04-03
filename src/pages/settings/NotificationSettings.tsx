import { useState, useEffect } from 'react';
import { Save, Mail, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{label}</p>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{description}</p>
      </div>
      <div className="relative shrink-0 ml-4">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="h-6 w-11 rounded-full bg-surface-200 dark:bg-surface-600 peer-checked:bg-brand-600 transition-colors" />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailOnOpen: true,
    emailOnDownload: true,
    emailOnExpiry: true,
    emailDigest: false,
  });
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('SecureShare');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          emailOnOpen: data.email_on_open,
          emailOnDownload: data.email_on_download,
          emailOnExpiry: data.email_on_expiry,
          emailDigest: data.email_digest,
        });
        setSenderEmail(data.sender_email);
        setSenderName(data.sender_name);
      }
      setLoadingData(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload = {
      id: user.id,
      email_on_open: settings.emailOnOpen,
      email_on_download: settings.emailOnDownload,
      email_on_expiry: settings.emailOnExpiry,
      email_digest: settings.emailDigest,
      sender_email: senderEmail,
      sender_name: senderName,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('notification_settings')
      .upsert(payload, { onConflict: 'id' });

    setSaving(false);

    if (upsertError) {
      setError('保存に失敗しました。もう一度お試しください。');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">通知設定</h3>
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        <Toggle checked={settings.emailOnOpen} onChange={(v) => setSettings({ ...settings, emailOnOpen: v })} label="開封通知メール" description="受信者がポータルにアクセスした際に通知" />
        <Toggle checked={settings.emailOnDownload} onChange={(v) => setSettings({ ...settings, emailOnDownload: v })} label="ダウンロード通知メール" description="受信者がファイルをダウンロードした際に通知" />
        <Toggle checked={settings.emailOnExpiry} onChange={(v) => setSettings({ ...settings, emailOnExpiry: v })} label="期限切れ警告メール" description="ダウンロードリンクの有効期限3日前に通知" />
        <Toggle checked={settings.emailDigest} onChange={(v) => setSettings({ ...settings, emailDigest: v })} label="日次ダイジェスト" description="毎朝、前日の送信・DL状況のサマリーを配信" />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-100 mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-surface-400" /> メール送信設定
        </h4>

        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            <p className="font-semibold mb-1">Resend ドメイン認証について</p>
            <p>
              メール送信には <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Resend</a> を使用しています。
              送信元メールアドレスのドメインは <strong>Resend ダッシュボードで認証済みである必要があります</strong>。
              未認証ドメインでは送信エラーになります。
              テスト目的では <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">onboarding@resend.dev</code> が使用できます。
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              送信元メールアドレス
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="input-field"
            />
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
              Resend で認証済みのドメインのアドレスを入力してください
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">送信元表示名</label>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="SecureShare"
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" /> 保存しました
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 animate-fade-in">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}
