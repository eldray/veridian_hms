import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Clock, Search, X, Zap, Plus } from 'lucide-react';
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
  const [radialOpen, setRadialOpen] = useState(false);
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

  const radialItems = useMemo(() => {
    const preferred = ['/dashboard/patients/register', '/dashboard/attendance', '/dashboard/medical-waiting-list', '/dashboard/laboratory', '/dashboard/pharmacy', '/dashboard/billing'];
    return preferred.map((path) => items.find((item) => item.path === path)).filter((item): item is QuickItem => !!item).slice(0, 6);
  }, [items]);

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
    setRadialOpen(false);
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
        setRadialOpen(false);
        return;
      }
      if (e.key === 'Escape' && (open || radialOpen)) close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, open, radialOpen]);

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
      <div className="fixed bottom-4 right-4 z-30 print:hidden" style={{ width: 40, height: 40 }}>
        {radialOpen && (
          <div
            role="menu"
            aria-label="Quick links"
            className="absolute bottom-[48px] right-0 z-10 w-56 max-w-[calc(100vw-2rem)] max-h-[min(55vh,400px)] overflow-y-auto overscroll-contain rounded-xl border p-2 shadow-xl backdrop-blur-xl"
            style={{
              background: 'color-mix(in srgb, var(--bg-card) 94%, transparent)',
              borderColor: 'var(--border-color)',
              boxShadow: '0 12px 34px rgba(2,12,27,.24)',
            }}
          >
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              Quick links
            </div>
            <div className="space-y-1">
              {radialItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => goTo(item)}
                    className="flex w-full min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--bg-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setRadialOpen(false); setOpen(true); }}
                className="flex w-full min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-[var(--bg-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                style={{ color: 'var(--icon-cyan-text)' }}
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--icon-cyan-bg)' }}>
                  <Search className="h-4 w-4" />
                </span>
                Search all pages
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setRadialOpen((value) => !value)}
          aria-label={radialOpen ? 'Close quick access' : 'Open quick access'}
          aria-expanded={radialOpen}
          aria-keyshortcuts="Control+K Meta+K"
          title="Quick access (Ctrl+K)"
          className="absolute inset-0 z-20 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          style={{
            background: 'rgba(18,107,145,.68)',
            color: '#fff',
            borderColor: 'rgba(255,255,255,.28)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            opacity: 0.64,
            boxShadow: '0 4px 14px rgba(2,12,27,.18)',
          }}
        >
          <Plus className={`h-5 w-5 transition-transform duration-200 ${radialOpen ? 'rotate-45' : 'rotate-0'}`} />
        </button>
      </div>
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
