import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Send,
  History,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  User,
  Server,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
  mobileOpen: boolean;
}

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/delivery/new', label: '新規送信', icon: Send },
  { to: '/history', label: '送信履歴', icon: History },
  { to: '/contacts', label: 'アドレス帳', icon: Users },
  { to: '/templates', label: 'テンプレート', icon: FileText },
  { to: '/settings', label: '設定', icon: Settings },
];

const userMenuItems = [
  { tab: 'profile', label: 'プロフィール', icon: User },
  { tab: 'servers', label: 'サーバー設定', icon: Server },
  { tab: 'notifications', label: '通知設定', icon: Bell },
  { tab: 'security', label: 'セキュリティ', icon: ShieldCheck },
];

export default function Sidebar({ collapsed, onToggle, onClose, mobileOpen }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const initials = profile?.full_name
    ? profile.full_name.slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || 'U';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleMenuNav = (tab: string) => {
    navigate(`/settings?tab=${tab}`);
    setMenuOpen(false);
    onClose();
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-surface-200 bg-white transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} w-64
          lg:relative lg:translate-x-0 ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-surface-200 px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <Shield className="h-7 w-7 shrink-0 text-brand-600" />
            <span className={`whitespace-nowrap text-lg font-bold text-brand-600 transition-all duration-300 ${collapsed ? 'lg:w-0 lg:opacity-0' : ''}`}>
              SecureShare
            </span>
          </Link>
          <button onClick={onClose} className="rounded-md p-1 text-surface-400 hover:bg-surface-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
          <button onClick={onToggle} className={`hidden rounded-md p-1 text-surface-400 hover:bg-surface-100 lg:block ${collapsed ? 'lg:mx-auto' : ''}`}>
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                title={collapsed ? label : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-600' : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:w-0 lg:overflow-hidden lg:opacity-0' : ''}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-surface-200 p-3" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-surface-200 bg-white py-1.5 shadow-lg animate-fade-in">
              {userMenuItems.map(({ tab, label, icon: Icon }) => (
                <button
                  key={tab}
                  onClick={() => handleMenuNav(tab)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                >
                  <Icon className="h-4 w-4 text-surface-400" />
                  {label}
                </button>
              ))}
              <div className="my-1.5 border-t border-surface-100" />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            title={collapsed ? (profile?.full_name || 'ユーザー') : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-50 ${collapsed ? 'lg:justify-center' : ''}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className={`min-w-0 flex-1 text-left transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-medium text-surface-800">{profile?.full_name || 'ユーザー'}</p>
              <p className="truncate text-xs text-surface-500">{profile?.email}</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
