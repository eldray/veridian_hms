// src/components/ThemePicker.tsx
// Appearance picker — redesigned to FILL the Settings tab like every other tab.
// Previous version was max-w-3xl + big airy cards, so it looked huge and left
// half the tab empty. This version:
//  - Full width, no max-width. Grid stretches: 2 cols -> 3 -> 4 on xl.
//  - Header row: heading left, mode toggle right — same header + actions
//    pattern as PageHeader on every other page, instead of a stacked block.
//  - Denser cards: smaller padding, shorter swatches, tighter text, so the
//    whole picker fits on screen instead of towering down it.
//  - Scheme names/descriptions still use the SCHEME's own text colours,
//    on purpose: each card's background IS that scheme's preview bg, so
//    the current theme's text colours would be unreadable on it.
import { Sun, Moon, Check } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { COLOR_SCHEMES } from '../styles/themes';

export default function ThemePicker() {
  const { schemeId, mode, setScheme, setMode } = useThemeStore();

  return (
    <div className="w-full space-y-4">
      {/* Header row — heading left, mode toggle right, like PageHeader + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Appearance</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Choose a color scheme and display mode. Your preference is saved to this device.
          </p>
        </div>

        {/* Display mode — same Segmented pill bar as the page tab bars */}
        <div className="inline-flex shrink-0 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] p-1 gap-1">
          {([
            { id: 'light' as const, label: 'Light', Icon: Sun },
            { id: 'dark' as const, label: 'Dark', Icon: Moon },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              title={`${label} mode`}
              aria-pressed={mode === id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === id
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color scheme — full-width grid, denser cards */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2.5 uppercase tracking-wide">Color Scheme</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {COLOR_SCHEMES.map((scheme) => {
            const isActive = schemeId === scheme.id;
            const bg = mode === 'light' ? scheme.previewBg.light : scheme.previewBg.dark;
            const card = mode === 'light' ? scheme.light : scheme.dark;
            return (
              <button
                key={scheme.id}
                onClick={() => setScheme(scheme.id)}
                className={`relative text-left rounded-xl border p-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)] ${
                  isActive
                    ? 'border-[var(--icon-cyan-text)] shadow-sm'
                    : 'border-[var(--border-color)] hover:border-[var(--icon-cyan-text)]'
                }`}
                style={{ background: bg }}
                aria-pressed={isActive}
                aria-label={`${scheme.name} theme`}
              >
                <div className="flex gap-1 mb-2">
                  <div className="h-5 flex-1 rounded border" style={{ background: card['--bg-card'], borderColor: card['--border-color'] }} />
                  <div className="h-5 w-5 rounded flex-shrink-0" style={{ background: scheme.previewAccent }} />
                  <div className="h-5 w-4 rounded flex-shrink-0" style={{ background: card['--icon-green-bg'] }} />
                  <div className="h-5 w-4 rounded flex-shrink-0" style={{ background: card['--icon-yellow-bg'] }} />
                </div>
                <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: card['--text-primary'] }}>{scheme.name}</p>
                <p className="mt-0.5 leading-snug line-clamp-2" style={{ color: card['--text-secondary'], fontSize: '11px' }}>{scheme.description}</p>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: scheme.previewAccent }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-tertiary)]">
            Currently using <span className="font-medium text-[var(--text-secondary)]">{COLOR_SCHEMES.find((s) => s.id === schemeId)?.name}</span>
            {' '}in <span className="font-medium text-[var(--text-secondary)]">{mode} mode</span>. Your preference is saved automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
