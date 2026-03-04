import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Download, Eye, Clock, Info, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '../../lib/notifications';
import { formatRelativeTime } from '../../utils/format';

const typeConfig: Record<Notification['type'], { icon: typeof Bell; color: string }> = {
  download: { icon: Download, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
  open: { icon: Eye, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
  expiry: { icon: Clock, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
  system: { icon: Info, color: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300' },
};

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount().then(setCount);
    const interval = setInterval(() => fetchUnreadCount().then(setCount), 30000);
    return () => clearInterval(interval);
  }, []);

  return { count, refresh: () => fetchUnreadCount().then(setCount) };
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onCountChange: () => void;
}

export default function NotificationPanel({ open, onClose, onCountChange }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications().then((data) => {
        setNotifications(data);
        setLoading(false);
      });
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  const handleRead = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      onCountChange();
    }
    if (n.delivery_id) {
      onClose();
      navigate(`/history/${n.delivery_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    onCountChange();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((x) => x.id !== id));
    onCountChange();
  };

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] card shadow-2xl overflow-hidden animate-fade-in z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100">通知</h3>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors">
            <CheckCheck className="h-3.5 w-3.5" />
            すべて既読
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-surface-400 dark:text-surface-500">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">通知はありません</p>
          </div>
        )}

        {!loading &&
          notifications.map((n) => {
            const cfg = typeConfig[n.type];
            const Icon = cfg.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleRead(n)}
                className={`flex items-start gap-3 w-full px-4 py-3 text-left transition-colors group
                  ${n.read
                    ? 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    : 'bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                  }`}
              >
                <div className={`rounded-lg p-2 shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm truncate ${n.read ? 'text-surface-600 dark:text-surface-300' : 'font-medium text-surface-800 dark:text-surface-100'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-400 shrink-0 mt-1.5" />
                    )}
                  </div>
                  {n.message && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-surface-400 dark:text-surface-500">
                      {formatRelativeTime(n.created_at)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <span className="p-1 rounded text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors" title="既読にする">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span
                        onClick={(e) => handleDelete(e, n.id)}
                        className="p-1 rounded text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
          <button
            onClick={() => { onClose(); navigate('/settings?tab=notifications'); }}
            className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
          >
            通知設定を管理
          </button>
        </div>
      )}
    </div>
  );
}
