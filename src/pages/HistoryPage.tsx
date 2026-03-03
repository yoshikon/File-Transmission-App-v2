import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, ChevronRight, FileText, Lock, Eye, Clock, XCircle, Loader2 } from 'lucide-react';
import { fetchDeliveries } from '../lib/deliveries';
import { formatDate, formatFileSize, daysUntilExpiry, isExpired } from '../utils/format';
import type { Delivery, DeliveryStatus } from '../types';

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'sent', label: '送信済み' },
  { value: 'expired', label: '期限切れ' },
  { value: 'revoked', label: '無効化' },
];

function StatusBadge({ status, expiresAt }: { status: DeliveryStatus; expiresAt: string }) {
  const expired = isExpired(expiresAt);
  const displayStatus = expired && status === 'sent' ? 'expired' : status;

  const config: Record<string, { label: string; className: string; icon: typeof Clock }> = {
    sent: { label: '送信済み', className: 'badge-info', icon: Eye },
    draft: { label: '下書き', className: 'badge-neutral', icon: FileText },
    expired: { label: '期限切れ', className: 'badge-error', icon: Clock },
    revoked: { label: '無効化', className: 'badge-error', icon: XCircle },
  };
  const { label, className, icon: Icon } = config[displayStatus];
  return (
    <span className={`${className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries().then((data) => {
      setDeliveries(data);
      setLoading(false);
    });
  }, []);

  const filtered = deliveries.filter((d) => {
    const matchSearch = !search || d.subject.toLowerCase().includes(search.toLowerCase()) || d.delivery_recipients?.some((r) => r.recipient_email.includes(search));
    const matchStatus = statusFilter === 'all' || d.status === statusFilter || (statusFilter === 'expired' && isExpired(d.expires_at));
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="件名・宛先で検索..."
            className="input-field pl-10 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-surface-400" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-surface-50 border-b border-surface-200 text-xs font-medium text-surface-500 uppercase tracking-wider">
          <div className="col-span-4">件名</div>
          <div className="col-span-2">宛先</div>
          <div className="col-span-2">ファイル</div>
          <div className="col-span-2">送信日時</div>
          <div className="col-span-1">ステータス</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-surface-100">
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-surface-400">該当する送信履歴がありません</div>
          )}
          {filtered.map((d) => {
            const fileCount = d.delivery_files?.length || 0;
            const totalSize = d.delivery_files?.reduce((sum, f) => sum + f.file_size, 0) || 0;
            const recipientCount = d.delivery_recipients?.length || 0;
            const dlCount = d.delivery_recipients?.filter((r) => r.download_count > 0).length || 0;
            const expDays = daysUntilExpiry(d.expires_at);

            return (
              <Link key={d.id} to={`/history/${d.id}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-surface-50 transition-colors items-center group">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className={`rounded-lg p-2 shrink-0 ${d.password_protected ? 'bg-amber-50' : 'bg-brand-50'}`}>
                    {d.password_protected ? <Lock className="h-4 w-4 text-amber-600" /> : <FileText className="h-4 w-4 text-brand-600" />}
                  </div>
                  <p className="text-sm font-medium text-surface-800 truncate">{d.subject}</p>
                </div>
                <div className="col-span-2 text-sm text-surface-600">
                  {d.delivery_recipients?.slice(0, 1).map((r) => r.recipient_email).join('')}
                  {recipientCount > 1 && <span className="text-surface-400 ml-1">+{recipientCount - 1}</span>}
                </div>
                <div className="col-span-2 text-sm text-surface-600 flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-surface-400" />
                  {fileCount}件 ({formatFileSize(totalSize)})
                  <span className="text-surface-400 text-xs ml-1">{dlCount}/{recipientCount} DL</span>
                </div>
                <div className="col-span-2 text-sm text-surface-500">
                  {formatDate(d.created_at)}
                  {!isExpired(d.expires_at) && expDays <= 3 && (
                    <span className="block text-xs text-amber-600 mt-0.5">残り{expDays}日</span>
                  )}
                </div>
                <div className="col-span-1">
                  <StatusBadge status={d.status} expiresAt={d.expires_at} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="h-5 w-5 text-surface-300 group-hover:text-surface-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
