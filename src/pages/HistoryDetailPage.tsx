import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Download, Clock, Eye, Lock,
  RefreshCw, XCircle, CalendarPlus, Copy, CheckCircle2,
  User, Mail, Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchDeliveryById } from '../lib/deliveries';
import { formatDate, formatFileSize, daysUntilExpiry, isExpired } from '../utils/format';
import type { Delivery } from '../types';

export default function HistoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchDeliveryById(id).then((data) => {
      setDelivery(data);
      setLoading(false);
    });
  }, [id]);

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
  const expDays = daysUntilExpiry(delivery.expires_at);
  const totalSize = delivery.delivery_files?.reduce((sum, f) => sum + f.file_size, 0) || 0;

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
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
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(delivery.created_at)}</span>
              {!expired ? (
                <span className={`flex items-center gap-1 ${expDays <= 3 ? 'text-amber-600 font-medium' : ''}`}>
                  有効期限: 残り{expDays}日
                </span>
              ) : (
                <span className="text-red-500 font-medium">期限切れ</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-secondary text-sm">
              <CalendarPlus className="h-4 w-4" /> 期限延長
            </button>
            <button className="btn-secondary text-sm">
              <RefreshCw className="h-4 w-4" /> 再送信
            </button>
            <button className="btn-danger text-sm">
              <XCircle className="h-4 w-4" /> リンク無効化
            </button>
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
            添付ファイル ({delivery.delivery_files?.length || 0}件 / {formatFileSize(totalSize)})
          </h3>
          <div className="grid gap-2">
            {delivery.delivery_files?.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-surface-200 p-3">
                <FileText className="h-5 w-5 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{f.file_name}</p>
                  <p className="text-xs text-surface-400">{formatFileSize(f.file_size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-surface-400" />
            受信者 ({delivery.delivery_recipients?.length || 0}件)
          </h3>
          <div className="space-y-3">
            {delivery.delivery_recipients?.map((r) => (
              <div key={r.id} className="rounded-lg border border-surface-200 p-4">
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
                          <Download className="h-3 w-3" /> {r.download_count}回DL
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleCopy(r.token)} className="btn-ghost text-xs">
                    {copied === r.token ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> コピー済み</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> URLコピー</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
