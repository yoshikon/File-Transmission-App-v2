import { Bell, Search, Menu, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GlobalSearch from './GlobalSearch';
import NotificationPanel, { useNotificationCount } from './NotificationPanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { count: unreadCount, refresh: refreshCount } = useNotificationCount();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 backdrop-blur-md px-4 dark:border-surface-700 dark:bg-surface-900/80 lg:px-8">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="rounded-md p-2 text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-surface-800 dark:text-surface-100">{title}</h1>
            {subtitle && <p className="text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="btn-ghost p-2 group"
            title="検索 (Ctrl+K)"
          >
            <Search className="h-5 w-5" />
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-surface-400 dark:text-surface-500">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 font-mono text-[10px]">
                Ctrl K
              </kbd>
            </span>
          </button>
          <button onClick={toggleTheme} className="btn-ghost p-2" title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}>
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="btn-ghost relative p-2"
              title="通知"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex items-center justify-center h-4 min-w-[1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              onCountChange={refreshCount}
            />
          </div>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
