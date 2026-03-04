import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = isSignUp
      ? await signUp(email, password, fullName)
      : await signIn(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-surface-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-12 w-12" />
            <span className="text-3xl font-bold">SecureShare</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            安全なファイル共有を、<br />もっとシンプルに。
          </h2>
          <p className="text-lg text-blue-100 leading-relaxed max-w-md">
            エンタープライズグレードのセキュリティで、重要なファイルをクライアントへ安全にお届けします。
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { num: '256bit', label: 'AES暗号化' },
              { num: '99.9%', label: '稼働率' },
              { num: '∞', label: 'ファイルサイズ' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold">{stat.num}</div>
                <div className="text-sm text-blue-200 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-surface-50 dark:bg-surface-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Shield className="h-10 w-10 text-brand-600" />
            <span className="text-2xl font-bold text-brand-600">SecureShare</span>
          </div>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 mb-1">
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mb-8">
              {isSignUp ? '新しいアカウントを作成します' : '送信者ポータルにログイン'}
            </p>

            {error && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 animate-slide-up dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">氏名</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="山田 太郎"
                    className="input-field"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">メールアドレス</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400 dark:text-surface-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.co.jp"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">パスワード</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400 dark:text-surface-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                    <input type="checkbox" className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-700" />
                    ログイン状態を保存
                  </label>
                  <button type="button" className="text-sm text-brand-600 hover:text-brand-700 font-medium dark:text-brand-400 dark:hover:text-brand-300">
                    パスワードを忘れた
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'アカウント作成' : 'ログイン'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {isSignUp ? 'すでにアカウントをお持ちの方' : 'アカウントをお持ちでない方'}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="ml-1 text-brand-600 hover:text-brand-700 font-medium dark:text-brand-400 dark:hover:text-brand-300"
            >
              {isSignUp ? 'ログイン' : '新規登録'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
