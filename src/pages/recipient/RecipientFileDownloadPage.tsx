import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Download, FileText, CheckCircle2, Loader2, AlertTriangle, XCircle, Clock, Ban } from 'lucide-react';
import { fetchFileByToken } from '../../lib/deliveries';
import { formatFileSize } from '../../utils/format';
import { getFileIcon, getExtensionDisplay, formatExpiryDisplay } from '../../utils/file-metadata';

type ErrorType = 'INVALID_TOKEN' | 'LINK_EXPIRED' | 'LINK_REVOKED' | 'DOWNLOAD_LIMIT_EXCEEDED' | null;

export default function RecipientFileDownloadPage() {
  const { token, fileToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [fileId, setFileId] = useState('');

  useEffect(() => {
    if (!token || !fileToken) {
      navigate('/d/invalid');
      return;
    }

    fetchFileByToken(token, fileToken).then(({ delivery, file, recipient, error: fetchError }) => {
      if (fetchError) {
        setError(fetchError as ErrorType);
        if (delivery) setExpiresAt(delivery.expires_at);
      } else if (file && recipient && delivery) {
        setFileName(file.file_name);
        setFileSize(file.file_size);
        setExpiresAt(delivery.expires_at);
        setRecipientId(recipient.id);
        setFileId(file.id);
      }
      setLoading(false);
    });
  }, [token, fileToken, navigate]);

  const handleDownload = async () => {
    if (!token || !fileToken) return;

    setDownloading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const downloadUrl = `${supabaseUrl}/functions/v1/download-file?delivery_token=${token}&file_token=${fileToken}`;

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloaded(true);
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました。');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-surface-500">リンクを検証中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} expiresAt={expiresAt} token={token} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50">
      <header className="bg-white border-b border-surface-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <Shield className="h-7 w-7 text-brand-600" />
          <span className="text-lg font-bold text-brand-600">SecureShare</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="card p-8 text-center animate-slide-up">
          {downloaded ? (
            <>
              <div className="rounded-full bg-emerald-100 p-5 mx-auto w-fit mb-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-surface-800 mb-2">ダウンロード完了</h1>
              <p className="text-sm text-surface-500 mb-4">ファイルのダウンロードが開始されました。</p>
              <div className="rounded-lg bg-surface-50 p-4 flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(fileName)}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-surface-800">{fileName}</p>
                  <p className="text-xs text-surface-400">{getExtensionDisplay(fileName)} · {formatFileSize(fileSize)}</p>
                </div>
              </div>
              {token && (
                <button
                  onClick={() => navigate(`/d/${token}`)}
                  className="btn-secondary text-sm mt-6"
                >
                  すべてのファイルを見る
                </button>
              )}
            </>
          ) : (
            <>
              <div className="rounded-full bg-brand-50 p-5 mx-auto w-fit mb-6">
                <Download className="h-12 w-12 text-brand-600" />
              </div>
              <h1 className="text-xl font-bold text-surface-800 mb-2">ファイルダウンロード</h1>
              <p className="text-sm text-surface-500 mb-6">以下のファイルをダウンロードします。</p>

              <div className="rounded-xl border border-surface-200 p-5 mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{getFileIcon(fileName)}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold text-surface-800">{fileName}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{getExtensionDisplay(fileName)} · {formatFileSize(fileSize)}</p>
                  </div>
                </div>
              </div>

              {expiresAt && (
                <p className="text-xs text-surface-400 mb-4 flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  有効期限: {formatExpiryDisplay(expiresAt)}
                </p>
              )}

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary w-full py-3 text-base"
              >
                {downloading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {downloading ? 'ダウンロード中...' : 'ダウンロード開始'}
              </button>

              {token && (
                <button
                  onClick={() => navigate(`/d/${token}`)}
                  className="btn-ghost text-sm mt-4 text-surface-500"
                >
                  すべてのファイルを見る
                </button>
              )}
            </>
          )}
        </div>

        <div className="text-center text-xs text-surface-400 mt-8">
          <p>SecureShare - セキュアファイル共有プラットフォーム</p>
        </div>
      </main>
    </div>
  );
}

function ErrorDisplay({ error, expiresAt, token }: { error: ErrorType; expiresAt: string; token?: string }) {
  const config = {
    INVALID_TOKEN: {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      bg: 'bg-red-50',
      title: 'リンクが無効です',
      message: 'このダウンロードリンクは無効です。送信者にご確認ください。',
    },
    LINK_EXPIRED: {
      icon: <Clock className="h-12 w-12 text-amber-500" />,
      bg: 'bg-amber-50',
      title: '有効期限が切れています',
      message: expiresAt
        ? `このリンクは${formatExpiryDisplay(expiresAt).replace('まで', '')}に期限切れになりました。送信者に再送をご依頼ください。`
        : 'このリンクの有効期限が切れています。送信者に再送をご依頼ください。',
    },
    LINK_REVOKED: {
      icon: <Ban className="h-12 w-12 text-surface-500" />,
      bg: 'bg-surface-100',
      title: 'リンクが無効化されました',
      message: 'このリンクは送信者によって無効化されています。',
    },
    DOWNLOAD_LIMIT_EXCEEDED: {
      icon: <AlertTriangle className="h-12 w-12 text-amber-500" />,
      bg: 'bg-amber-50',
      title: 'ダウンロード回数上限',
      message: 'ダウンロード回数の上限に達しました。追加ダウンロードが必要な場合は送信者にご連絡ください。',
    },
  };

  const c = config[error || 'INVALID_TOKEN'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50">
      <header className="bg-white border-b border-surface-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <Shield className="h-7 w-7 text-brand-600" />
          <span className="text-lg font-bold text-brand-600">SecureShare</span>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="card p-8 text-center animate-slide-up">
          <div className={`rounded-full ${c.bg} p-5 mx-auto w-fit mb-6`}>
            {c.icon}
          </div>
          <h1 className="text-xl font-bold text-surface-800 mb-3">{c.title}</h1>
          <p className="text-sm text-surface-500 leading-relaxed">{c.message}</p>
        </div>
      </main>
    </div>
  );
}
