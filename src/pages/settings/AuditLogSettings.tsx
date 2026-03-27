import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  RefreshCw, User, Send, FileText, PenLine, BookUser, Download,
  LogIn, LogOut, UserPlus, KeyRound, RotateCcw, CalendarClock, Trash2, Pencil,
  X, ChevronDown,
} from 'lucide-react';
import { fetchAuditLogs, ACTION_LABELS, ACTION_CATEGORIES, type AuditLogFilters } from '../../lib/audit';
import type { AuditLog } from '../../types';
import { formatDate } from '../../utils/format';

type AuditLogWithProfile = AuditLog & {
  profiles?: { full_name: string; email: string } | null;
};

const ACTION_ICONS: Record<string, typeof Shield> = {
  'user.login': LogIn,
  'user.logout': LogOut,
  'user.signup': UserPlus,
  'user.password_change': KeyRound,
  'delivery.create': Send,
  'delivery.revoke': RotateCcw,
  'delivery.extend_expiry': CalendarClock,
  'delivery.schedule': CalendarClock,
  'file.upload': FileText,
  'file.download': Download,
  'template.create': FileText,
  'template.update': Pencil,
  'template.delete': Trash2,
  'signature.create': PenLine,
  'signature.update': Pencil,
  'signature.delete': Trash2,
  'contact.create': BookUser,
  'contact.delete': Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  'user.login': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  'user.logout': 'text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
  'user.signup': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  'user.password_change': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  'delivery.create': 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20',
  'delivery.revoke': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  'delivery.extend_expiry': 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
  'delivery.schedule': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  'file.upload': 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
  'file.download': 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
  'template.create': 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
  'template.update': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  'template.delete': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  'signature.create': 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
  'signature.update': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  'signature.delete': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  'contact.create': 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
  'contact.delete': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
};

const PAGE_SIZE = 50;

export default function AuditLogSettings() {
  const [logs, setLogs] = useState<AuditLogWithProfile[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = useCallback(async (p: number, filters: AuditLogFilters, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    const { data, count: total } = await fetchAuditLogs(filters, p, PAGE_SIZE);
    setLogs(data);
    setCount(total);
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, []);

  const buildFilters = useCallback((): AuditLogFilters => ({
    action: selectedAction || undefined,
    resource: searchText || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
  }), [selectedAction, searchText, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
    loadLogs(0, buildFilters());
  }, [selectedAction, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadLogs(0, buildFilters());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    loadLogs(page, buildFilters());
  }, [page]);

  const handleRefresh = () => {
    loadLogs(page, buildFilters(), true);
  };

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const hasFilters = selectedAction || searchText || dateFrom || dateTo;

  const clearFilters = () => {
    setSelectedAction('');
    setSearchText('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            監査ログ
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            システム上のすべての操作履歴を確認できます
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-ghost p-2 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400"
          title="更新"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="リソースで検索..."
            className="input-field pl-9 py-2 text-sm"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-secondary text-sm gap-1.5 ${showFilters || hasFilters ? 'border-brand-400 text-brand-600 dark:text-brand-400' : ''}`}
        >
          <Filter className="h-4 w-4" />
          フィルター
          {hasFilters && (
            <span className="ml-1 h-4 w-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
              {[selectedAction, dateFrom, dateTo].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">アクション</label>
              <div className="relative">
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="input-field py-2 text-sm appearance-none pr-8"
                >
                  <option value="">すべて</option>
                  {Object.entries(ACTION_CATEGORIES).map(([cat, actions]) => (
                    <optgroup key={cat} label={cat}>
                      {actions.map((a) => (
                        <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">開始日</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">終了日</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field py-2 text-sm" />
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-surface-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors">
              <X className="h-3 w-3" /> フィルターをクリア
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-surface-400 dark:text-surface-500">
        <span>全 {count.toLocaleString()} 件</span>
        {totalPages > 1 && (
          <span>ページ {page + 1} / {totalPages}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-surface-400">
          <div className="h-6 w-6 border-2 border-surface-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-12 text-center">
          <Shield className="h-10 w-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
          <p className="text-surface-500 dark:text-surface-400 font-medium">ログが見つかりませんでした</p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-brand-600 dark:text-brand-400 mt-2 hover:underline">
              フィルターをクリア
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] ?? Shield;
              const colorClass = ACTION_COLORS[log.action] ?? 'text-surface-500 bg-surface-100';
              const isExpanded = expandedId === log.id;
              const hasDetails = log.details && Object.keys(log.details).length > 0;

              return (
                <div key={log.id} className="bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors">
                  <button
                    className="w-full text-left px-4 py-3 flex items-start gap-3"
                    onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className={`shrink-0 rounded-lg p-1.5 mt-0.5 ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        {log.resource && (
                          <span className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-xs">
                            {log.resource}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
                          <User className="h-3 w-3" />
                          {log.profiles?.full_name || log.profiles?.email || '不明'}
                        </span>
                        {log.ip_address && (
                          <span className="text-xs text-surface-400 dark:text-surface-500 font-mono">
                            {log.ip_address}
                          </span>
                        )}
                        <span className="text-xs text-surface-400 dark:text-surface-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                    {hasDetails && (
                      <ChevronDown className={`h-4 w-4 text-surface-400 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-3 pl-11 animate-fade-in">
                      <div className="rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-700 p-3">
                        <p className="text-xs font-medium text-surface-400 dark:text-surface-500 mb-2">詳細</p>
                        <div className="space-y-1">
                          {Object.entries(log.details!).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-3 text-xs">
                              <span className="text-surface-400 dark:text-surface-500 w-32 shrink-0 font-mono">{k}</span>
                              <span className="text-surface-700 dark:text-surface-300 break-all">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-ghost p-2 text-surface-400 hover:text-surface-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (page < 4) {
                pageNum = i;
              } else if (page > totalPages - 5) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${pageNum === page ? 'bg-brand-600 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-ghost p-2 text-surface-400 hover:text-surface-700 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
