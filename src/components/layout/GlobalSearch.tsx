import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Send, Users, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { globalSearch, type SearchResult } from '../../lib/search';

const typeConfig: Record<SearchResult['type'], { icon: typeof Send; label: string; color: string }> = {
  delivery: { icon: Send, label: '送信', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
  contact: { icon: Users, label: '連絡先', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
  template: { icon: FileText, label: 'テンプレート', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
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

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    globalSearch(q).then((res) => {
      setResults(res);
      setLoading(false);
      setSelectedIndex(-1);
    });
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    onClose();
    navigate(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm animate-fade-in">
      <div ref={panelRef} className="w-full max-w-lg mx-4">
        <div className="card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <Search className="h-5 w-5 text-surface-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="送信履歴、連絡先、テンプレートを検索..."
              className="flex-1 bg-transparent text-surface-800 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 text-sm outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-surface-400 shrink-0" />}
            <button onClick={onClose} className="p-1 rounded-md text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {query.length >= 2 && (
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && !loading && (
                <div className="px-4 py-8 text-center text-sm text-surface-400 dark:text-surface-500">
                  該当する結果がありません
                </div>
              )}
              {results.map((result, i) => {
                const cfg = typeConfig[result.type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                      i === selectedIndex
                        ? 'bg-brand-50 dark:bg-brand-900/20'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    }`}
                  >
                    <div className={`rounded-lg p-2 shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {query.length < 2 && (
            <div className="px-4 py-6 text-center text-xs text-surface-400 dark:text-surface-500">
              2文字以上入力して検索
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-400 dark:text-surface-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 font-mono">↑↓</kbd>
                移動
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 font-mono">Enter</kbd>
                選択
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 font-mono">Esc</kbd>
              閉じる
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
