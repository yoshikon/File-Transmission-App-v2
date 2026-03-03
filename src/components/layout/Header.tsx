import { Bell, Search, Menu } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 backdrop-blur-md px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="rounded-md p-2 text-surface-500 hover:bg-surface-100 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-surface-800">{title}</h1>
          {subtitle && <p className="text-xs text-surface-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {searchOpen ? (
          <div className="animate-fade-in">
            <input
              autoFocus
              onBlur={() => setSearchOpen(false)}
              placeholder="検索..."
              className="input-field w-48 py-1.5 text-sm lg:w-64"
            />
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="btn-ghost p-2">
            <Search className="h-5 w-5" />
          </button>
        )}
        <button className="btn-ghost relative p-2">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}
