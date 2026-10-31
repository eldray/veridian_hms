import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Clock, Search, X, Zap } from 'lucide-react';
import { NAV_GROUP_ORDER, PAGES, canAccessPage } from '../config/access';
import { QUICK_AREAS } from '../config/quickAccess';
import { useAuthStore } from '../store/authStore';

interface QuickItem {
  id: string;
  label: string;
  path: string;
  group: string;
  icon: typeof Zap;
  hint?: string;
}

const RECENT_KEY = 'hms.quickAccess.recent';
const RECENT_LIMIT = 6;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Floating launcher for the whole app: every screen and the shortcuts inside it,
 * filtered by what the signed-in role may actually open.
 */
export function QuickAccessFab() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecent);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<QuickItem[]>(() => {
    const role = user?.role;
    const pageItems: QuickItem[] = PAGES
      .filter((page) => page.label && page.icon && page.group && canAccessPage(role, page.key))
      .map((page) => ({
        id: `page:${page.key}`,
        label: page.label as string,
        path: page.paths[0],
        group: page.group as string,
        icon: page.icon as typeof Zap,
      }));

    const areaItems: QuickItem[] = QUICK_AREAS
      .filter((area) => canAccessPage(role, area.pageKey))
      .map((area) => {
        const owner = PAGES.find((page) => page.key === area.pageKey);
        return {
          id: `area:${area.path}`,
          label: area.label,
          path: area.path,
          group: owner?.group ?? 'Core',
          icon: owner?.icon ?? Zap,
          hint: area.hint,
        };
      });

    // Pages and their shortcuts share a group so the list reads as one area of the app.
    return [...pageItems, ...areaItems];
  }, [user?.role]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? items.filter((item) =>
          item.label.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q) ||
          (item.hint ?? '').toLowerCase().includes(q))
      : items;

    const order = (group: string) => {
      const index = NAV_GROUP_ORDER.indexOf(group);
      return index === -1 ? NAV_GROUP_ORDER.length : index;
    };
    return [...matched].sort((a, b) =>
      order(a.group) - order(b.group) || a.label.localeCompare(b.label));
  }, [items, query]);

  const recentItems = useMemo(() => {
    if (query.trim() || recent.length === 0) return [];
    return recent
      .map((path) => items.find((item) => item.path === path))
      .filter((item): item is QuickItem => !!item);
  }, [items, recent, query]);

  // The keyboard cursor walks recents first because they are rendered first.
  const navigable = useMemo(() => [...recentItems, ...results], [recentItems, results]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const goTo = useCallback((item: QuickItem) => {
    const next = [item.path, ...recent.filter((path) => path !== item.path)].slice(0, RECENT_LIMIT);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Private mode or a full store: the launcher still works, it just won't remember.
    }
    close();
    if (item.path !== location.pathname) navigate(item.path);
  }, [close, location.pathname, navigate, recent]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const cursor = listRef.current?.querySelector('[data-active="true"]');
    cursor?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navigable.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = navigable[activeIndex];
      if (item) goTo(item);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open quick access"
        aria-keyshortcuts="Control+K Meta+K"
        title="Quick access (Ctrl+K)"
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 hover:shadow-lg print:hidden"
        style={{ background: 'var(--icon-cyan-text)', color: '#ffffff' }}
      >
        <Zap className="w-5 h-5" />
      </button>
    );
  }

  let cursor = -1;

  const renderRow = (item: QuickItem, isRecent = false) => {
    cursor += 1;
    const index = cursor;
    const isActive = index === activeIndex;
    const isCurrent = item.path === location.pathname;
    const Icon = item.icon;
    return (
      <button
        key={`${item.id}:${isRecent ? 'r' : 'a'}`}
        type="button"
        role="option"
        aria-selected={isActive}
        data-active={isActive || undefined}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => goTo(item)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
        style={{ background: isActive ? 'var(--bg-main)' : 'transparent' }}
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-medium text-[var(--text-primary)] truncate">{item.label}</span>
          <span className="block text-[10px] text-[var(--text-tertiary)] truncate">
            {item.hint ? `${item.group} · ${item.hint}` : item.group}
          </span>
        </span>
        {isCurrent && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--icon-green-text)]">
            <Check className="w-3 h-3" /> Here
          </span>
        )}
      </button>
    );
  };

  let lastGroup: string | null = null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick access"
        className="w-full max-w-lg rounded-xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Search className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to a page or area…"
            aria-label="Search pages"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close quick access"
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} role="listbox" aria-label="Quick access results" className="max-h-[50vh] overflow-y-auto py-1">
          {navigable.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">
              No page matches “{query.trim()}”.
            </p>
          ) : (
            <>
              {recentItems.length > 0 && (
                <div>
                  <p
                    className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest uppercase select-none"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Clock className="w-3 h-3" /> Recent
                  </p>
                  {recentItems.map((item) => renderRow(item, true))}
                </div>
              )}
              {results.map((item) => {
                const heading = item.group === lastGroup ? null : item.group;
                lastGroup = item.group;
                return (
                  <div key={`wrap:${item.id}`}>
                    {heading && (
                      <p
                        className="px-3 pt-2.5 pb-1 text-[10px] font-bold tracking-widest uppercase select-none"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {heading}
                      </p>
                    )}
                    {renderRow(item)}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div
          className="flex items-center justify-between px-3 py-2 border-t text-[10px]"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-tertiary)' }}
        >
          <span>↑ ↓ to move · Enter to open · Esc to close</span>
          <span>{navigable.length} destinations</span>
        </div>
      </div>
    </div>
  );
}

export default QuickAccessFab;
