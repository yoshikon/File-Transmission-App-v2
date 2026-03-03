import { useState } from 'react';
import { Shield, Globe, Save, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SecuritySettings() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwResult, setPwResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [twoFaMsg, setTwoFaMsg] = useState('');
  const [ipMsg, setIpMsg] = useState('');

  const handlePasswordChange = async () => {
    setPwResult(null);
    if (newPw.length < 6) {
      setPwResult({ type: 'error', msg: 'パスワードは6文字以上で入力してください' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwResult({ type: 'error', msg: 'パスワードが一致しません' });
      return;
    }
    setChangingPw(true);
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

  const handle2fa = () => {
    setTwoFaMsg('2段階認証の設定は今後のアップデートで対応予定です');
    setTimeout(() => setTwoFaMsg(''), 3000);
  };

  const handleIp = () => {
    setIpMsg('IP制限の設定は今後のアップデートで対応予定です');
    setTimeout(() => setIpMsg(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-lg font-semibold text-surface-800">セキュリティ設定</h3>
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-surface-200">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5 text-brand-600" />
            <p className="text-sm font-semibold text-surface-800">2段階認証</p>
          </div>
          <p className="text-xs text-surface-500 mb-3">TOTP認証アプリ（Google Authenticator等）を使用した追加認証</p>
          <button onClick={handle2fa} className="btn-secondary text-sm">設定する</button>
          {twoFaMsg && (
            <p className="mt-2 text-xs text-amber-600 animate-fade-in">{twoFaMsg}</p>
          )}
        </div>

        <div className="p-4 rounded-lg border border-surface-200">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-5 w-5 text-brand-600" />
            <p className="text-sm font-semibold text-surface-800">IPアドレス制限</p>
          </div>
          <p className="text-xs text-surface-500 mb-3">許可されたIPアドレスからのみアクセスを許可</p>
          <button onClick={handleIp} className="btn-secondary text-sm">設定する</button>
          {ipMsg && (
            <p className="mt-2 text-xs text-amber-600 animate-fade-in">{ipMsg}</p>
          )}
        </div>

        <div className="p-4 rounded-lg border border-surface-200">
          <p className="text-sm font-semibold text-surface-800 mb-3">パスワード変更</p>
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
      </div>
    </div>
  );
}
