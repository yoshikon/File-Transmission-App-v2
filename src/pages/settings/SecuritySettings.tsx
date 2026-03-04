import { useState, useEffect } from 'react';
import { Shield, Globe, Save, CheckCircle2, Eye, EyeOff, Plus, Trash2, X, Loader2, Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface IpRestriction {
  id: string;
  ip_address: string;
  label: string;
  enabled: boolean;
}

export default function SecuritySettings() {
  const { user } = useAuth();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwResult, setPwResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">セキュリティ設定</h3>
      <div className="space-y-4">
        <TwoFactorSection />
        <IpRestrictionSection userId={user?.id ?? ''} />
        <PasswordChangeSection
          currentPw={currentPw} setCurrentPw={setCurrentPw}
          newPw={newPw} setNewPw={setNewPw}
          confirmPw={confirmPw} setConfirmPw={setConfirmPw}
          showPw={showPw} setShowPw={setShowPw}
          changingPw={changingPw} setChangingPw={setChangingPw}
          pwResult={pwResult} setPwResult={setPwResult}
        />
      </div>
    </div>
  );
}

function TwoFactorSection() {
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [unenrolling, setUnenrolling] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const totpFactor = data?.totp?.find((f) => f.status === 'verified');
    if (totpFactor) {
      setFactorId(totpFactor.id);
    }
    setLoading(false);
  };

  const startEnroll = async () => {
    setEnrolling(true);
    setError('');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) {
      setError(error.message);
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const verifyEnrollment = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);
    setError('');

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      setError('認証コードが正しくありません。もう一度お試しください。');
      setVerifying(false);
      return;
    }

    setEnrolling(false);
    setVerifyCode('');
    setVerifying(false);
    setQrCode('');
    setSecret('');
    await checkMfaStatus();
  };

  const handleUnenroll = async () => {
    if (!factorId) return;
    setUnenrolling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setError(error.message);
    } else {
      setFactorId(null);
      setEnrolling(false);
      setQrCode('');
      setSecret('');
    }
    setUnenrolling(false);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
  };

  if (loading) {
    return (
      <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-brand-600 animate-spin" />
          <p className="text-sm text-surface-500 dark:text-surface-400">2段階認証の状態を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-brand-600" />
          <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">2段階認証</p>
        </div>
        {factorId && !enrolling && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" /> 有効
          </span>
        )}
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
        TOTP認証アプリ（Google Authenticator等）を使用した追加認証
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {!factorId && !enrolling && (
        <button onClick={startEnroll} className="btn-secondary text-sm">
          <Shield className="h-4 w-4" /> 設定する
        </button>
      )}

      {enrolling && qrCode && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col items-center gap-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <p className="text-xs text-surface-600 dark:text-surface-300 font-medium">
              認証アプリで下のQRコードをスキャンしてください
            </p>
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
            <div className="w-full">
              <button onClick={() => setShowSecret(!showSecret)} className="text-xs text-brand-600 hover:text-brand-700 font-medium mb-1">
                {showSecret ? 'シークレットキーを非表示' : 'QRコードが読めない場合'}
              </button>
              {showSecret && (
                <div className="flex items-center gap-2 bg-surface-100 dark:bg-surface-700 rounded p-2">
                  <code className="text-xs text-surface-700 dark:text-surface-300 font-mono flex-1 break-all">{secret}</code>
                  <button onClick={copySecret} className="btn-ghost p-1.5 shrink-0">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              アプリに表示された6桁のコードを入力
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input-field text-center text-lg font-mono tracking-[0.5em]"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEnrolling(false); setQrCode(''); setSecret(''); setVerifyCode(''); setError(''); handleUnenroll(); }} className="btn-secondary flex-1">
              キャンセル
            </button>
            <button onClick={verifyEnrollment} disabled={verifyCode.length !== 6 || verifying} className="btn-primary flex-1">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              認証して有効化
            </button>
          </div>
        </div>
      )}

      {factorId && !enrolling && (
        <div className="flex items-center gap-2 pt-1">
          <button onClick={handleUnenroll} disabled={unenrolling} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20">
            {unenrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            無効にする
          </button>
        </div>
      )}
    </div>
  );
}

function IpRestrictionSection({ userId }: { userId: string }) {
  const [restrictions, setRestrictions] = useState<IpRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ip_address: '', label: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) loadRestrictions();
  }, [userId]);

  const loadRestrictions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ip_restrictions')
      .select('*')
      .order('created_at', { ascending: true });
    setRestrictions(data ?? []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.ip_address.trim() || !userId) return;
    setSaving(true);
    const { error } = await supabase.from('ip_restrictions').insert({
      user_id: userId,
      ip_address: form.ip_address.trim(),
      label: form.label.trim() || form.ip_address.trim(),
      enabled: true,
    });
    setSaving(false);
    if (!error) {
      setForm({ ip_address: '', label: '' });
      setShowForm(false);
      await loadRestrictions();
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from('ip_restrictions').update({ enabled: !enabled }).eq('id', id);
    setRestrictions((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !enabled } : r));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('ip_restrictions').delete().eq('id', id);
    setRestrictions((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-brand-600" />
          <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">IPアドレス制限</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-secondary text-xs py-1.5">
            <Plus className="h-3.5 w-3.5" /> 追加
          </button>
        )}
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">許可されたIPアドレスからのみアクセスを許可</p>

      {showForm && (
        <div className="mb-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-800 space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">IPアドレス / CIDR</label>
            <input
              value={form.ip_address}
              onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
              placeholder="192.168.1.0/24 または 203.0.113.50"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">ラベル（任意）</label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="本社オフィス"
              className="input-field text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm({ ip_address: '', label: '' }); }} className="btn-secondary text-xs">キャンセル</button>
            <button onClick={handleAdd} disabled={!form.ip_address.trim() || saving} className="btn-primary text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              追加
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
          <span className="text-xs text-surface-400">読み込み中...</span>
        </div>
      ) : restrictions.length === 0 ? (
        <p className="text-xs text-surface-400 dark:text-surface-500 py-2">IP制限は設定されていません。すべてのIPからアクセス可能です。</p>
      ) : (
        <div className="space-y-2">
          {restrictions.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-surface-50 dark:bg-surface-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{r.label}</p>
                <p className="text-xs text-surface-400 font-mono">{r.ip_address}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(r.id, r.enabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.enabled ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${r.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
                <button onClick={() => handleDelete(r.id)} className="btn-ghost p-1 text-surface-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordChangeSection({
  currentPw, setCurrentPw,
  newPw, setNewPw,
  confirmPw, setConfirmPw,
  showPw, setShowPw,
  changingPw, setChangingPw,
  pwResult, setPwResult,
}: {
  currentPw: string; setCurrentPw: (v: string) => void;
  newPw: string; setNewPw: (v: string) => void;
  confirmPw: string; setConfirmPw: (v: string) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  changingPw: boolean; setChangingPw: (v: boolean) => void;
  pwResult: { type: 'success' | 'error'; msg: string } | null;
  setPwResult: (v: { type: 'success' | 'error'; msg: string } | null) => void;
}) {
  const handlePasswordChange = async () => {
    setPwResult(null);
    if (!currentPw) {
      setPwResult({ type: 'error', msg: '現在のパスワードを入力してください' });
      return;
    }
    if (newPw.length < 6) {
      setPwResult({ type: 'error', msg: 'パスワードは6文字以上で入力してください' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwResult({ type: 'error', msg: 'パスワードが一致しません' });
      return;
    }
    setChangingPw(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setChangingPw(false);
      setPwResult({ type: 'error', msg: 'ユーザー情報の取得に失敗しました' });
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });

    if (verifyError) {
      setChangingPw(false);
      setPwResult({ type: 'error', msg: '現在のパスワードが正しくありません' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setChangingPw(false);
    if (error) {
      setPwResult({ type: 'error', msg: error.message });
    } else {
      setPwResult({ type: 'success', msg: 'パスワードを変更しました' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwResult(null), 4000);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
      <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 mb-3">パスワード変更</p>
      <div className="grid gap-3">
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="現在のパスワード"
            className="input-field pr-10"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <input
          type={showPw ? 'text' : 'password'}
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="新しいパスワード（6文字以上）"
          className="input-field"
        />
        <input
          type={showPw ? 'text' : 'password'}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="新しいパスワード（確認）"
          className="input-field"
        />
      </div>
      {pwResult && (
        <p className={`mt-2 text-xs animate-fade-in ${pwResult.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
          {pwResult.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />}
          {pwResult.msg}
        </p>
      )}
      <button
        onClick={handlePasswordChange}
        disabled={changingPw || !currentPw || !newPw || !confirmPw}
        className="btn-primary mt-3 text-sm"
      >
        {changingPw ? (
          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        変更
      </button>
    </div>
  );
}
