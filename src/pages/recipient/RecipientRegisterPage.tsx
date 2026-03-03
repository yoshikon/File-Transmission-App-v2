import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RecipientRegisterPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
  const strengthLabels = ['', '弱い', '普通', '強い'];
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];
  const valid = password.length >= 6 && password === confirm && agreed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    navigate(`/d/${token}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Shield className="h-9 w-9 text-brand-600" />
          <span className="text-2xl font-bold text-brand-600">SecureShare</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-surface-800 mb-1">初回登録</h1>
          <p className="text-sm text-surface-500 mb-6">パスワードを設定してファイルをダウンロードしてください</p>

          <div className="bg-surface-50 rounded-lg p-3 mb-6 text-sm">
            <span className="text-surface-500">メールアドレス:</span>
            <span className="ml-2 font-medium text-surface-800">tanaka@client.co.jp</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">パスワード</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="input-field pl-10 pr-10"
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : 'bg-surface-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${strength >= 2 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    パスワード強度: {strengthLabels[strength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">パスワード（確認）</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="パスワードを再入力"
                  className="input-field pl-10"
                />
              </div>
              {confirm && confirm !== password && (
                <p className="text-xs text-red-500 mt-1">パスワードが一致しません</p>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-2">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-surface-600">
                <button type="button" className="text-brand-600 hover:underline">利用規約</button>および
                <button type="button" className="text-brand-600 hover:underline">プライバシーポリシー</button>に同意します
              </span>
            </label>

            <button type="submit" disabled={!valid || loading} className="btn-primary w-full py-3 mt-2">
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>登録して確認する <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          SecureShare - セキュアファイル共有プラットフォーム
        </p>
      </div>
    </div>
  );
}
