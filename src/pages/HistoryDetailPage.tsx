import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Download, Clock, Eye, Lock,
  RefreshCw, XCircle, CalendarPlus, Copy, CheckCircle2,
  User, Mail, Loader2, Link2, AlertTriangle, Ban, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchDeliveryById, revokeDelivery, extendDeliveryExpiry } from '../lib/deliveries';
import { formatDate, formatFileSize, daysUntilExpiry, isExpired } from '../utils/format';
import { buildDownloadUrl, getFileIcon, getExtensionDisplay, formatExpiryDisplay } from '../utils/file-metadata';
import type { Delivery, DeliveryRecipient } from '../types';

export default function HistoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState('');
  const [copiedFileUrl, setCopiedFileUrl] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showExtendMenu, setShowExtendMenu] = useState(false);
  const [expandedRecipients, setExpandedRecipients] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState(false);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadDelivery();
  }, [id]);

  const loadDelivery = async () => {
    if (!id) return;
    const data = await fetchDeliveryById(id);
    setDelivery(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="text-center py-20">
        <p className="text-surface-500">送信データが見つかりません</p>
        <button onClick={() => navigate('/history')} className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4" /> 履歴に戻る
        </button>
      </div>
    );
  }

  const expired = isExpired(delivery.expires_at);
  const revoked = delivery.status === 'revoked';
  const expDays = daysUntilExpiry(delivery.expires_at);
  const totalSize = delivery.delivery_files?.reduce((sum, f) => sum + f.file_size, 0) || 0;
  const files = delivery.delivery_files || [];
  const recipients = delivery.delivery_recipients || [];

  const statusBadge = () => {
    if (revoked) return <span className="badge bg-surface-100 text-surface-600 flex items-center gap-1"><Ban className="h-3 w-3" /> 無効化済み</span>;
    if (expired) return <span className="badge-error flex items-center gap-1"><Clock className="h-3 w-3" /> 期限切れ</span>;
    return <span className="badge-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 有効</span>;
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCopyFileUrl = (deliveryToken: string, fileToken: string) => {
    const url = buildDownloadUrl(deliveryToken, fileToken);
    navigator.clipboard.writeText(url);
    setCopiedFileUrl(fileToken);
    setTimeout(() => setCopiedFileUrl(''), 2000);
  };

  const handleRevoke = async () => {
    if (!delivery) return;
    setRevoking(true);
    const { error } = await revokeDelivery(delivery.id);
    if (!error) {
      await loadDelivery();
    }
    setRevoking(false);
    setShowRevokeConfirm(false);
  };

  const handleExtend = async (days: number) => {
    if (!delivery) return;
    setExtending(true);
    const { error } = await extendDeliveryExpiry(delivery.id, days);
    if (!error) {
      await loadDelivery();
    }
    setExtending(false);
    setShowExtendMenu(false);
  };

  const toggleRecipient = (recipientId: string) => {
    setExpandedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(recipientId)) next.delete(recipientId);
      else next.add(recipientId);
      return next;
    });
  };

  const getRecipientFileDownloads = (r: DeliveryRecipient) => {
    const counts = r.file_download_counts || {};
    return files.map((f) => ({
      file: f,
      count: counts[f.id] || 0,
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/history')} className="btn-ghost text-surface-500">
        <ArrowLeft className="h-4 w-4" /> 送信履歴に戻る
      </button>

      <div className="card p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {delivery.password_protected ? (
                <div className="rounded-lg bg-amber-50 p-2"><Lock className="h-5 w-5 text-amber-600" /></div>
              ) : (
                <div className="rounded-lg bg-brand-50 p-2"><FileText className="h-5 w-5 text-brand-600" /></div>
              )}
              <h2 className="text-xl font-bold text-surface-800">{delivery.subject}</h2>
              {statusBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(delivery.created_at)}</span>
              {!expired && !revoked ? (
                <span className={`flex items-center gap-1 ${expDays <= 3 ? 'text-amber-600 font-medium' : ''}`}>
                  {expDays <= 3 && <AlertTriangle className="h-3.5 w-3.5" />}
                  有効期限: 残り{expDays}日
                </span>
              ) : expired && !revoked ? (
                <span className="text-red-500 font-medium">期限切れ</span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!revoked && (
              <>
                <div className="relative">
                  <button onClick={() => setShowExtendMenu(!showExtendMenu)} disabled={extending} className="btn-secondary text-sm">
                    <CalendarPlus className="h-4 w-4" /> 期限延長
                  </button>
                  {showExtendMenu && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-white rounded-lg border border-surface-200 shadow-lg py-1 min-w-[140px]">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => handleExtend(d)}
                          className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50"
                        >
                          +{d}日
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowRevokeConfirm(true)} className="btn-danger text-sm">
                  <XCircle className="h-4 w-4" /> リンク無効化
                </button>
              </>
            )}
          </div>
        </div>

        {delivery.message && (
          <div className="bg-surface-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-surface-500 font-medium mb-1">メッセージ</p>
            <p className="text-sm text-surface-700 whitespace-pre-wrap">{delivery.message}</p>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-surface-400" />
            添付ファイル ({files.length}件 / {formatFileSize(totalSize)})
          </h3>
          <div className="grid gap-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-surface-200 p-3">
                <span className="text-xl shrink-0">{getFileIcon(f.file_name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{f.file_name}</p>
                  <p className="text-xs text-surface-400">{getExtensionDisplay(f.file_name)} · {formatFileSize(f.file_size)}</p>
                </div>
                <span className="text-xs text-surface-400 font-mono">{f.file_token.slice(0, 8)}...</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-surface-400" />
            受信者・ダウンロード状況 ({recipients.length}件)
          </h3>
          <div className="space-y-3">
            {recipients.map((r) => {
              const isExpanded = expandedRecipients.has(r.id);
              const fileDownloads = getRecipientFileDownloads(r);
              const totalDl = fileDownloads.reduce((sum, fd) => sum + fd.count, 0);

              return (
                <div key={r.id} className="rounded-lg border border-surface-200 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                    onClick={() => toggleRecipient(r.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-surface-100 p-2">
                          <Mail className="h-4 w-4 text-surface-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-800">{r.recipient_email}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-400">
                            <span className="badge-neutral text-xs">{r.recipient_type.toUpperCase()}</span>
                            {r.first_accessed_at ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Eye className="h-3 w-3" /> 閲覧済み ({formatDate(r.first_accessed_at)})
                              </span>
                            ) : (
                              <span>未閲覧</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" /> {totalDl}回DL
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(r.token); }}
                          className="btn-ghost text-xs"
                        >
                          {copied === r.token ? (
                            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> コピー済み</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> URLコピー</>
                          )}
                        </button>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-200 bg-surface-50 p-4">
                      <p className="text-xs font-medium text-surface-600 mb-3 flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" /> ファイル別ダウンロードURL・状況
                      </p>
                      <div className="space-y-2">
                        {fileDownloads.map(({ file, count }) => {
                          const fileUrl = buildDownloadUrl(r.token, file.file_token);
                          return (
                            <div key={file.id} className="rounded-lg bg-white border border-surface-200 p-3">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg">{getFileIcon(file.file_name)}</span>
                                <span className="text-sm font-medium text-surface-800 flex-1 truncate">{file.file_name}</span>
                                <span className="text-xs text-surface-400">{count}回DL</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={fileUrl}
                                  className="input-field text-xs font-mono text-surface-500 bg-surface-50 flex-1 py-1.5"
                                  onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).select(); }}
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopyFileUrl(r.token, file.file_token); }}
                                  className={`btn-ghost p-1.5 text-xs shrink-0 ${copiedFileUrl === file.file_token ? 'text-emerald-600' : ''}`}
                                >
                                  {copiedFileUrl === file.file_token ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {(r.download_logs?.length ?? 0) > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-surface-600 mb-2">ダウンロード履歴</p>
                          <div className="space-y-1">
                            {r.download_logs?.slice(0, 10).map((log) => {
                              const f = files.find((fl) => fl.id === log.file_id);
                              return (
                                <div key={log.id} className="flex items-center gap-3 text-xs text-surface-500 py-1.5">
                                  <span className="text-surface-400">{formatDate(log.downloaded_at)}</span>
                                  <span className="font-medium text-surface-700">{f?.file_name || 'ファイル'}</span>
                                  <span className="badge-neutral text-[10px]">{log.download_type === 'bulk' ? '一括' : '個別'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRevokeConfirm(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="rounded-full bg-red-50 p-4 mx-auto w-fit mb-4">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-surface-800 mb-2">リンクを無効化しますか?</h3>
              <p className="text-sm text-surface-500">
                すべての受信者のダウンロードリンクが即時無効になります。この操作は取り消せません。
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowRevokeConfirm(false)} className="btn-secondary">キャンセル</button>
              <button onClick={handleRevoke} disabled={revoking} className="btn-danger">
                {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                無効化する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
