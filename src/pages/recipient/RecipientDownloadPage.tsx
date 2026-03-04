import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, Download, FileText, Image, FileSpreadsheet, File,
  Clock, CheckCircle2, Lock, Package, AlertTriangle, Loader2, Ban,
} from 'lucide-react';
import { formatFileSize, formatDate, daysUntilExpiry } from '../../utils/format';
import { getFileIcon } from '../../utils/file-metadata';
import { fetchDeliveryByToken, recordDownload } from '../../lib/deliveries';
import type { Delivery, DeliveryFile } from '../../types';

function getIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'doc', 'docx'].includes(ext)) return <FileText className="h-6 w-6 text-red-500" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <Image className="h-6 w-6 text-teal-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
  return <File className="h-6 w-6 text-surface-400" />;
}

export default function RecipientDownloadPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [recipientId, setRecipientId] = useState('');
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/d/invalid');
      return;
    }

    fetchDeliveryByToken(token).then(({ delivery: d, recipient }) => {
      if (!d || !recipient) {
        navigate('/d/invalid');
        return;
      }

      if (d.status === 'revoked') {
        setDelivery(d);
        setLoading(false);
        return;
      }

      if (new Date(d.expires_at) < new Date()) {
        navigate(`/d/${token}/expired`);
        return;
      }

      setDelivery(d);
      setRecipientId(recipient.id);

      if (d.password_protected) {
        setAuthenticated(false);
      }

      setLoading(false);
    });
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-surface-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!delivery) return null;

  if (delivery.status === 'revoked') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50">
        <header className="bg-white border-b border-surface-200 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-bold text-brand-600">SecureShare</span>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <div className="card p-8 text-center animate-slide-up">
            <div className="rounded-full bg-surface-100 p-5 mx-auto w-fit mb-6">
              <Ban className="h-12 w-12 text-surface-500" />
            </div>
            <h1 className="text-xl font-bold text-surface-800 mb-3">リンクが無効化されました</h1>
            <p className="text-sm text-surface-500">このリンクは送信者によって無効化されています。</p>
          </div>
        </main>
      </div>
    );
  }

  const files = delivery.delivery_files || [];
  const expDays = daysUntilExpiry(delivery.expires_at);
  const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);
  const downloadedCount = downloadedFiles.size;

  const handleDownload = async (file: DeliveryFile) => {
    if (!token) return;

    setDownloading(file.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const downloadUrl = `${supabaseUrl}/functions/v1/download-file?delivery_token=${token}&file_token=${file.file_token}`;

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadedFiles((prev) => new Set(prev).add(file.id));
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました。');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!token) return;

    setDownloading('all');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const downloadUrl = `${supabaseUrl}/functions/v1/download-zip?delivery_token=${token}`;

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('ZIP download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${delivery.subject.replace(/[^a-zA-Z0-9-_]/g, '_')}_files.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      files.forEach((f) => {
        setDownloadedFiles((prev) => new Set(prev).add(f.id));
      });
    } catch (error) {
      console.error('ZIP download error:', error);
      alert('一括ダウンロードに失敗しました。');
    } finally {
      setDownloading(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 text-center animate-slide-up">
          <div className="rounded-full bg-amber-50 p-4 mx-auto w-fit mb-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-800 mb-2">パスワード認証</h2>
          <p className="text-sm text-surface-500 mb-6">このファイルはパスワードで保護されています</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="パスワードを入力"
            className="input-field mb-4"
            onKeyDown={(e) => e.key === 'Enter' && setAuthenticated(true)}
          />
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
          <h1 className="text-xl font-bold text-surface-800 mb-2">{delivery.subject}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500 mb-6">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {expDays <= 3 ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> 残り{expDays}日
                </span>
              ) : (
                <span>有効期限: {formatDate(delivery.expires_at)}</span>
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

          {delivery.message && (
            <div className="bg-surface-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-surface-500 font-medium mb-1">送信者からのメッセージ</p>
              <p className="text-sm text-surface-700 whitespace-pre-wrap">{delivery.message}</p>
            </div>
          )}

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
                <div className="shrink-0">{getIcon(f.file_name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{f.file_name}</p>
                  <p className="text-xs text-surface-400">{formatFileSize(f.file_size)}</p>
                </div>
                {downloadedFiles.has(f.id) ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> 取得済み
                  </span>
                ) : (
                  <button
                    onClick={() => handleDownload(f)}
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
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full transition-all duration-1000 animate-pulse" style={{ width: '67%' }} />
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-surface-400">
          <p>SecureShare - セキュアファイル共有プラットフォーム</p>
        </div>
      </main>
    </div>
  );
}
