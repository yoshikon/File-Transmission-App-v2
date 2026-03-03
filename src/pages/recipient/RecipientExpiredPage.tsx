import { Shield, Clock, Mail } from 'lucide-react';

export default function RecipientExpiredPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Shield className="h-9 w-9 text-brand-600" />
          <span className="text-2xl font-bold text-brand-600">SecureShare</span>
        </div>

        <div className="card p-8">
          <div className="rounded-full bg-red-50 p-4 mx-auto w-fit mb-4">
            <Clock className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-surface-800 mb-2">有効期限切れ</h1>
          <p className="text-sm text-surface-500 mb-6">
            このダウンロードリンクは有効期限が切れています。
            ファイルが引き続き必要な場合は、送信者にご連絡ください。
          </p>
          <div className="bg-surface-50 rounded-lg p-4">
            <p className="text-xs text-surface-500 mb-2">お問い合わせ先</p>
            <a href="mailto:support@company.co.jp" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
              <Mail className="h-4 w-4" /> support@company.co.jp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
