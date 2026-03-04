import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, ArrowRight, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function RecipientRegisterPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/d/invalid');
      return;
    }
    loadRecipientInfo();
  }, [token]);

  const loadRecipientInfo = async () => {
    const { data } = await supabase
      .from('delivery_recipients')
      .select('recipient_email')
      .eq('token', token!)
      .maybeSingle();

    if (!data) {
      navigate('/d/invalid');
      return;
    }
    setRecipientEmail(data.recipient_email);
    setPageLoading(false);
  };

  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
  const strengthLabels = ['', '弱い', '普通', '強い'];
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];
  const valid = password.length >= 6 && password === confirm && agreed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !token) return;
    setLoading(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          password,
          delivery_token: token,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || '登録に失敗しました。もう一度お試しください。');
        setLoading(false);
        return;
      }

      navigate(`/d/${token}`);
    } catch {
      setError('ネットワークエラーが発生しました。もう一度お試しください。');
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-surface-500">読み込み中...</p>
        </div>
      </div>
    );
  }

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
            <span className="ml-2 font-medium text-surface-800">{recipientEmail}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

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
                <button type="button" onClick={() => setShowTerms(true)} className="text-brand-600 hover:underline">利用規約</button>および
                <button type="button" onClick={() => setShowPrivacy(true)} className="text-brand-600 hover:underline">プライバシーポリシー</button>に同意します
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

      {showTerms && (
        <PolicyModal title="利用規約" onClose={() => setShowTerms(false)}>
          <TermsContent />
        </PolicyModal>
      )}

      {showPrivacy && (
        <PolicyModal title="プライバシーポリシー" onClose={() => setShowPrivacy(false)}>
          <PrivacyContent />
        </PolicyModal>
      )}
    </div>
  );
}

function PolicyModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm text-surface-700 leading-relaxed space-y-4">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-surface-200">
          <button onClick={onClose} className="btn-primary w-full">閉じる</button>
        </div>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-xs text-surface-400">最終更新日: 2025年1月1日</p>
      <h3 className="font-semibold text-surface-800">第1条（適用）</h3>
      <p>この利用規約（以下「本規約」）は、SecureShare（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本サービスを利用することにより、本規約に同意したものとみなされます。</p>
      <h3 className="font-semibold text-surface-800">第2条（利用条件）</h3>
      <p>本サービスは、ファイルの安全な送受信を目的として提供されます。ユーザーは、以下の行為を行ってはなりません。</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>法令または公序良俗に違反する行為</li>
        <li>犯罪行為に関連する行為</li>
        <li>本サービスの運営を妨害する行為</li>
        <li>他のユーザーの情報を不正に収集する行為</li>
        <li>第三者に不利益を与える行為</li>
      </ul>
      <h3 className="font-semibold text-surface-800">第3条（アカウント管理）</h3>
      <p>ユーザーは自己の責任においてアカウントを管理するものとします。パスワードの管理不備により生じた損害について、当社は一切の責任を負いません。</p>
      <h3 className="font-semibold text-surface-800">第4条（ファイルの保管）</h3>
      <p>アップロードされたファイルは設定された有効期限まで保管されます。有効期限経過後、ファイルは自動的に削除されます。当社はファイルの永続的な保管を保証するものではありません。</p>
      <h3 className="font-semibold text-surface-800">第5条（免責事項）</h3>
      <p>当社は本サービスの完全性、正確性、有用性等について保証するものではありません。本サービスの利用により生じた損害について、当社の故意または重大な過失がある場合を除き、責任を負いません。</p>
      <h3 className="font-semibold text-surface-800">第6条（規約の変更）</h3>
      <p>当社は必要に応じて本規約を変更することがあります。変更後の利用規約は本サービス上で告知した時点から効力を生じるものとします。</p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-surface-400">最終更新日: 2025年1月1日</p>
      <h3 className="font-semibold text-surface-800">1. 収集する情報</h3>
      <p>本サービスでは、以下の情報を収集します。</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>メールアドレス（アカウント識別のため）</li>
        <li>氏名（表示名として使用）</li>
        <li>アップロードファイルのメタデータ（ファイル名、サイズ、種類）</li>
        <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時）</li>
      </ul>
      <h3 className="font-semibold text-surface-800">2. 情報の利用目的</h3>
      <p>収集した情報は以下の目的で利用します。</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>本サービスの提供・運営</li>
        <li>ユーザー認証およびセキュリティの確保</li>
        <li>ファイル送受信の記録と通知</li>
        <li>サービスの改善・新機能の開発</li>
        <li>重要なお知らせの送信</li>
      </ul>
      <h3 className="font-semibold text-surface-800">3. 情報の共有</h3>
      <p>当社は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。ただし、以下の場合を除きます。</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>法令に基づく開示要求があった場合</li>
        <li>人の生命・身体・財産の保護に必要な場合</li>
        <li>サービス運営に必要な業務委託先への提供</li>
      </ul>
      <h3 className="font-semibold text-surface-800">4. データの保護</h3>
      <p>当社は、収集した情報の漏洩、滅失、毀損を防止するため、適切なセキュリティ対策を講じます。データは暗号化された通信経路を通じて送受信され、安全な環境で保管されます。</p>
      <h3 className="font-semibold text-surface-800">5. データの保持期間</h3>
      <p>アップロードされたファイルは設定された有効期限に従い削除されます。アカウント情報はアカウント削除時まで保持されます。アクセスログは90日間保持した後、自動的に削除されます。</p>
      <h3 className="font-semibold text-surface-800">6. お問い合わせ</h3>
      <p>個人情報の取り扱いに関するお問い合わせは、本サービスのサポート窓口までご連絡ください。</p>
    </>
  );
}
