import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield, Download, FileText, Image, FileSpreadsheet, File,
  Clock, CheckCircle2, Lock, Package, AlertTriangle,
} from 'lucide-react';
import { formatFileSize, formatDate, daysUntilExpiry } from '../../utils/format';

interface MockFile {
  id: string;
  name: string;
  size: number;
  downloaded: boolean;
}

const mockFiles: MockFile[] = [
  { id: 'f1', name: 'Q3_Report_2025.pdf', size: 2457600, downloaded: false },
  { id: 'f2', name: 'Sales_Data.xlsx', size: 1048576, downloaded: false },
  { id: 'f3', name: 'Presentation.pptx', size: 8388608, downloaded: false },
];

function getIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'doc', 'docx'].includes(ext)) return <FileText className="h-6 w-6 text-red-500" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <Image className="h-6 w-6 text-teal-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
  return <File className="h-6 w-6 text-surface-400" />;
}

export default function RecipientDownloadPage() {
  const { token } = useParams();
  const [files, setFiles] = useState(mockFiles);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const expDays = daysUntilExpiry(expiresAt);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const downloadedCount = files.filter((f) => f.downloaded).length;

  const handleDownload = async (fileId: string) => {
    setDownloading(fileId);
    await new Promise((r) => setTimeout(r, 1500));
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, downloaded: true } : f));
    setDownloading(null);
  };

  const handleDownloadAll = async () => {
    setDownloading('all');
    await new Promise((r) => setTimeout(r, 3000));
    setFiles((prev) => prev.map((f) => ({ ...f, downloaded: true })));
    setDownloading(null);
  };

  if (showPassword && !authenticated) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 text-center animate-slide-up">
          <div className="rounded-full bg-amber-50 p-4 mx-auto w-fit mb-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-800 mb-2">パスワード認証</h2>
          <p className="text-sm text-surface-500 mb-6">このファイルはパスワードで保護されています</p>
          <input type="password" placeholder="パスワードを入力" className="input-field mb-4" />
          <button onClick={() => setAuthenticated(true)} className="btn-primary w-full">認証</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50">
      <header className="bg-white border-b border-surface-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-bold text-brand-600">SecureShare</span>
          </div>
          <span className="text-xs text-surface-400">Token: {token?.slice(0, 8)}...</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-6 lg:p-8 mb-6 animate-slide-up">
          <h1 className="text-xl font-bold text-surface-800 mb-2">2025年度 第3四半期 営業レポート</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500 mb-6">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {expDays <= 3 ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> 残り{expDays}日
                </span>
              ) : (
                <span>有効期限: {formatDate(expiresAt)}</span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              {files.length}ファイル ({formatFileSize(totalSize)})
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {downloadedCount}/{files.length} ダウンロード済み
            </span>
          </div>

          <div className="bg-surface-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-surface-500 font-medium mb-1">送信者からのメッセージ</p>
            <p className="text-sm text-surface-700">
              お世話になっております。第3四半期の営業レポートをお送りいたします。ご確認のほどよろしくお願いいたします。
            </p>
            <div className="mt-3 pt-3 border-t border-surface-200 text-xs text-surface-500">
              <p className="font-medium">佐藤 翔太</p>
              <p>株式会社サンプル 営業部</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-800">ファイル一覧</h2>
            <button
              onClick={handleDownloadAll}
              disabled={downloading !== null || downloadedCount === files.length}
              className="btn-primary text-sm"
            >
              {downloading === 'all' ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              一括ダウンロード (ZIP)
            </button>
          </div>

          <div className="space-y-3">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-4 p-4 rounded-xl border border-surface-200 hover:border-brand-200 hover:bg-brand-50/20 transition-all">
                <div className="shrink-0">{getIcon(f.name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{f.name}</p>
                  <p className="text-xs text-surface-400">{formatFileSize(f.size)}</p>
                </div>
                {f.downloaded ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> 取得済み
                  </span>
                ) : (
                  <button
                    onClick={() => handleDownload(f.id)}
                    disabled={downloading !== null}
                    className="btn-secondary text-sm py-2"
                  >
                    {downloading === f.id ? (
                      <div className="h-4 w-4 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> ダウンロード
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          {downloading && downloading !== 'all' && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                <span>ダウンロード中...</span>
                <span>67%</span>
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full transition-all duration-1000 animate-pulse" style={{ width: '67%' }} />
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-surface-400">
          <p>SecureShare - セキュアファイル共有プラットフォーム</p>
          <p className="mt-1">お問い合わせ: support@company.co.jp</p>
        </div>
      </main>
    </div>
  );
}
