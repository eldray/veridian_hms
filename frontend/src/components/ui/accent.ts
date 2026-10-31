/**
 * The accent washes every screen may pick from. Values come from the active
 * colour scheme, injected as CSS variables by themeStore.
 */
export const ACCENTS = ['cyan', 'purple', 'blue', 'indigo', 'green', 'red', 'orange', 'yellow'] as const;

export type Accent = (typeof ACCENTS)[number];

/** `var(--icon-cyan-bg)` for a dynamic accent name; inline style, not a Tailwind class. */
export function accentVar(accent: Accent, part: 'bg' | 'text'): string {
  return `var(--icon-${accent}-${part})`;
}
