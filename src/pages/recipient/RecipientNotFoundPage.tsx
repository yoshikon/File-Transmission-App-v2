import { Shield, AlertTriangle } from 'lucide-react';

export default function RecipientNotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Shield className="h-9 w-9 text-brand-600" />
          <span className="text-2xl font-bold text-brand-600">SecureShare</span>
        </div>

        <div className="card p-8">
          <div className="rounded-full bg-amber-50 p-4 mx-auto w-fit mb-4">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-surface-800 mb-2">ページが見つかりません</h1>
          <p className="text-sm text-surface-500 mb-6">
            無効なURLです。リンクが正しいかご確認ください。
            問題が解決しない場合は、送信者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
