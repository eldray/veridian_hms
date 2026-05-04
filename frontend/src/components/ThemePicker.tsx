// src/components/ThemePicker.tsx
// A settings panel where users choose their color scheme and light/dark mode.
// Drop this into your Settings page or a sidebar drawer.

import { useState } from 'react';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { COLOR_SCHEMES } from '../styles/themes';

export default function ThemePicker() {
  const { schemeId, mode, setScheme, setMode } = useThemeStore();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--icon-purple-bg)] rounded-lg flex items-center justify-center">
            <Palette className="w-4 h-4 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Appearance</p>
            <p className="text-xs text-[var(--text-secondary)]">Color scheme &amp; display mode</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-[var(--bg-main)] rounded-lg p-1 border border-[var(--border-color)]">
          <button
            onClick={() => setMode('light')}
            title="Light mode"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'light'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            onClick={() => setMode('dark')}
            title="Dark mode"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'dark'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
        </div>
      </div>

      {/* Scheme grid */}
      <div className="p-5">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
          Color Scheme
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLOR_SCHEMES.map((scheme) => {
            const isActive = schemeId === scheme.id;
            const isHovered = hovered === scheme.id;
            const bg = mode === 'light' ? scheme.previewBg.light : scheme.previewBg.dark;

            return (
              <button
                key={scheme.id}
                onClick={() => setScheme(scheme.id)}
                onMouseEnter={() => setHovered(scheme.id)}
                onMouseLeave={() => setHovered(null)}
                className={`relative text-left rounded-xl border-2 p-3 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  isActive
                    ? 'border-[var(--icon-cyan-text)] shadow-sm'
                    : 'border-[var(--border-color)] hover:border-[var(--icon-cyan-text)]'
                }`}
                style={{
                  background: bg,
                  focusRingColor: scheme.previewAccent,
                }}
                aria-pressed={isActive}
                aria-label={`${scheme.name} theme`}
              >
                {/* Preview swatch strip */}
                <div className="flex gap-1 mb-2.5">
                  {/* bg-card preview */}
                  <div
                    className="h-6 flex-1 rounded-md border"
                    style={{
                      background: mode === 'light' ? scheme.light['--bg-card'] : scheme.dark['--bg-card'],
                      borderColor: mode === 'light' ? scheme.light['--border-color'] : scheme.dark['--border-color'],
                    }}
                  />
                  {/* accent color */}
                  <div
                    className="h-6 w-6 rounded-md flex-shrink-0"
                    style={{ background: scheme.previewAccent }}
                  />
                  {/* green */}
                  <div
                    className="h-6 w-5 rounded-md flex-shrink-0"
                    style={{
                      background: mode === 'light'
                        ? scheme.light['--icon-green-bg']
                        : scheme.dark['--icon-green-bg'],
                    }}
                  />
                  {/* yellow */}
                  <div
                    className="h-6 w-5 rounded-md flex-shrink-0"
                    style={{
                      background: mode === 'light'
                        ? scheme.light['--icon-yellow-bg']
                        : scheme.dark['--icon-yellow-bg'],
                    }}
                  />
                </div>

                {/* Name & description */}
                <p
                  className="text-xs font-semibold leading-tight"
                  style={{
                    color: mode === 'light'
                      ? scheme.light['--text-primary']
                      : scheme.dark['--text-primary'],
                  }}
                >
                  {scheme.name}
                </p>
                <p
                  className="text-xs mt-0.5 leading-snug"
                  style={{
                    color: mode === 'light'
                      ? scheme.light['--text-secondary']
                      : scheme.dark['--text-secondary'],
                    fontSize: '10px',
                  }}
                >
                  {scheme.description}
                </p>

                {/* Active checkmark */}
                {isActive && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: scheme.previewAccent }}
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active scheme info */}
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-tertiary)]">
            Currently using{' '}
            <span className="font-medium text-[var(--text-secondary)]">
              {COLOR_SCHEMES.find(s => s.id === schemeId)?.name}
            </span>{' '}
            in{' '}
            <span className="font-medium text-[var(--text-secondary)]">
              {mode} mode
            </span>.
            Your preference is saved automatically.
          </p>
        </div>
      </div>
    </div>
  );
}