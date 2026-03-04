import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send, Download, Clock, TrendingUp, ArrowUpRight,
  ChevronRight, FileText, Lock, Eye, AlertTriangle, Loader2,
} from 'lucide-react';
import { fetchDeliveries } from '../lib/deliveries';
import { formatRelativeTime, formatFileSize, daysUntilExpiry, isExpired } from '../utils/format';
import type { Delivery, DeliveryStatus } from '../types';

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Send;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card p-6 hover:shadow-md dark:hover:shadow-surface-900/50 transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-surface-800 dark:text-surface-100">{value}</div>
        <div className="mt-1 text-sm text-surface-500 dark:text-surface-400">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const config: Record<DeliveryStatus, { label: string; className: string }> = {
    sent: { label: '送信済み', className: 'badge-info' },
    draft: { label: '下書き', className: 'badge-neutral' },
    expired: { label: '期限切れ', className: 'badge-error' },
    revoked: { label: '無効化', className: 'badge-error' },
  };
  const { label, className } = config[status];
  return <span className={className}>{label}</span>;
}

export default function DashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries().then((data) => {
      setDeliveries(data);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const thisMonth = deliveries.filter((d) => {
    const created = new Date(d.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  const monthlySends = thisMonth.length;
  const pendingDownloads = deliveries.filter(
    (d) => d.status === 'sent' && !isExpired(d.expires_at) && d.delivery_recipients?.some((r) => r.download_count === 0)
  ).length;
  const expiringLinks = deliveries.filter(
    (d) => d.status === 'sent' && !isExpired(d.expires_at) && daysUntilExpiry(d.expires_at) <= 3
  ).length;
  const monthlyDownloads = thisMonth.reduce(
    (sum, d) => sum + (d.delivery_recipients?.reduce((s, r) => s + r.download_count, 0) || 0), 0
  );

  const recentDeliveries = deliveries.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-800 dark:text-surface-100">概要</h2>
          <p className="text-surface-500 dark:text-surface-400 mt-1">今月の送信状況をご確認ください</p>
        </div>
        <Link to="/delivery/new" className="btn-primary">
          <Send className="h-4 w-4" />
          新規送信
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Send} label="今月の送信件数" value={monthlySends} color="bg-blue-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400" />
        <StatCard icon={Clock} label="未ダウンロード" value={pendingDownloads} color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />
        <StatCard icon={AlertTriangle} label="期限切れ間近" value={expiringLinks} color="bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" />
        <StatCard icon={Download} label="今月のDL数" value={monthlyDownloads} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-6 pb-2">
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">最近の送信</h3>
          <Link to="/history" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1">
            すべて表示 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-surface-700">
          {recentDeliveries.length === 0 && (
            <div className="px-6 py-12 text-center text-surface-400 dark:text-surface-500">送信履歴がありません</div>
          )}
          {recentDeliveries.map((d) => {
            const fileCount = d.delivery_files?.length || 0;
            const totalSize = d.delivery_files?.reduce((sum, f) => sum + f.file_size, 0) || 0;
            const recipientCount = d.delivery_recipients?.length || 0;
            const downloadedCount = d.delivery_recipients?.filter((r) => r.download_count > 0).length || 0;
            const expDays = daysUntilExpiry(d.expires_at);
            const expired = isExpired(d.expires_at);

            return (
              <Link key={d.id} to={`/history/${d.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors group">
                <div className={`rounded-lg p-2.5 ${d.password_protected ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-brand-50 dark:bg-brand-900/20'}`}>
                  {d.password_protected ? <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" /> : <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{d.subject}</p>
                    <StatusBadge status={expired && d.status === 'sent' ? 'expired' : d.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-surface-500 dark:text-surface-400">
                    <span>{fileCount}ファイル ({formatFileSize(totalSize)})</span>
                    <span>{recipientCount}件の宛先</span>
                    <span>{formatRelativeTime(d.created_at)}</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{downloadedCount}/{recipientCount} DL</span>
                  </div>
                  {!expired && expDays <= 3 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">残り{expDays}日</span>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-surface-300 dark:text-surface-600 group-hover:text-surface-500 dark:group-hover:text-surface-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
