/**
 * Shared table idioms. Three header styles used to coexist — queue pages, newer
 * dashboards and legacy Tailwind-gray pages — so tables of the same data looked
 * different depending on where they were reached from.
 */

/** Header cell: label, alignment and optional sort affordance. */
// Headers sit over left-aligned cells by default; numeric/status/action columns opt into centering.
export const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] whitespace-nowrap';
export const TH_ROW = 'bg-[var(--bg-main)] border-b border-[var(--border-color)]';
export const TD = 'px-4 py-3 text-sm text-[var(--text-primary)] whitespace-nowrap';
export const TD_MUTED = 'px-4 py-3 text-sm text-[var(--text-secondary)]';
export const TR = 'border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-main)] transition-colors';
export const TABLE_SHELL = 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden';
/** Identifier column — folder no., attendance no., bill no. — so mono columns scan. */
export const TD_MONO = `${TD} font-mono`;

// Form controls, so a filter strip matches the field itself.
export const INPUT = 'px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all placeholder:text-[var(--text-tertiary)]';
export const SELECT = `${INPUT} pr-8 cursor-pointer`;
export const SEARCH_INPUT = `${INPUT} pl-10 pr-3 w-full`;
