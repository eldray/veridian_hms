# UI conversion contract (temporary working notes — delete when the pass is done)

Target: every page of `frontend/src/pages` opens with the same header and every control looks
and behaves like the same control everywhere. Only presentation markup and imports change.
**Behaviour must not change.**

## Primitives to target (read them first, never edit them)
- `components/ui/PageHeader.tsx` — `title`, `subtitle`, `meta`, `icon`, `accent`, `backTo`,
  `onBack`, `actions`, `tabs`
- `components/ui/Button.tsx` — `Button` **and** `LinkButton` (a react-router `Link` that looks
  identical). Variants `primary|secondary|soft|ghost|outline|danger|dangerSoft`, sizes
  `xs|sm|md`, props `icon`, `iconRight`, `loading`, `iconOnly` (requires `aria-label`),
  `fullWidth`, `accent` (only `soft` uses `accent`)
- `components/ui/Card.tsx` — `Card` (`title`, `description`, `icon`, `accent`, `actions`,
  `padded`, `className`) and `StatCard` (`label`, `value`, `size: 'count'|'money'`, `icon`,
  `accent`, `hint`, `onClick`)
- `components/ui/Pagination.tsx` — `page`, `totalPages`, `itemsPerPage`, `totalItems`,
  `onChange`, `noun`
- `components/ui/table.ts` — `TH`, `TH_ROW`, `TD`, `TD_MUTED`, `TD_MONO`, `TR`, `TABLE_SHELL`,
  `INPUT`, `SELECT`, `SEARCH_INPUT`
- `components/ui/Badge.tsx` — `Badge` (`tone`, `dot`, `size`), `statusTone()`, `humanStatus()`
- `components/ui/Controls.tsx` — `SearchInput` (`value`, `onChange(string)`, `placeholder`),
  `FilterSelect`, `Field`
- `components/ui/index.ts` — the barrel. Always import from `../components/ui`
  (`../../components/ui` in nested folders).
- Finished references, copy their idiom exactly: `pages/InsuranceClaims.tsx`,
  `pages/ClaimBatches.tsx`, `pages/CorporateAccounts.tsx`, `pages/Counter.tsx`.

## Rules
1. **Header.** Replace the title block (`<h1>` + its subtitle `<p>` + the sibling action
   `<button>`/styled `<Link>`) with one `<PageHeader …/>`. Keep the exact wording of
   title/subtitle/meta, including dynamic values and role gates. A loading or error branch of
   the same page renders the same PageHeader. Detail screens use `backTo`/`onBack`. A tab strip
   or filter bar that belongs under the title goes in `tabs`. In `actions`: secondary first,
   primary last.
2. **Accent** comes from the page's sidebar group in `config/access.ts`: Core `cyan`,
   Clinical `green`, Ward `indigo`, Diagnostics `purple`, Pharmacy `blue`, Revenue `yellow`,
   HR & Staff `orange`, Management `red`. If the page's existing header already commits to a
   different `--icon-*` colour, keep that instead. Use the lucide icon `access.ts` assigns.
3. **Buttons.** `<button>` → `Button`, styled `<Link>` → `LinkButton`.
   - main page action → `variant="primary"` or `variant="soft" accent="…"`
   - neutral side action → `variant="secondary"`
   - icon-only control → `variant="ghost" iconOnly icon={X} aria-label="…"`
   - destructive → `danger` / `dangerSoft`
   - `bg-[var(--icon-X-bg)] text-[var(--icon-X-text)]` tint → `variant="soft" accent="X"`
   - disabled-while-working with a spinner child → `loading={…}`
   Keep `type="submit"`, `disabled`, `onClick`, and width utilities (`className="flex-1"`).
   **Do not convert** things that are not push buttons: table sort headers, clickable rows or
   whole cards acting as links, tab strips, accordion toggles, quantity steppers, checkbox/radio
   tiles, combobox option rows. Leave them exactly as they are.
4. **Stat tiles.** Delete any local `StatCard`/`Stat`/`SummaryCard` component inside the page and
   use the shared one; money values use `size="money"`. Only colour a tile where the page already
   coloured it.
5. **Pager.** Replace hand-rolled pagination ("Showing x to y of z" + prev/next/number buttons)
   with `<Pagination page totalPages itemsPerPage totalItems onChange noun="…" />`. Do not change
   how those numbers are computed. Delete imports that become unused (`ChevronLeft`, …).
6. **Tables.** `<thead className={TH_ROW}>`, `cn(TH, …)` / `cn(TD, …)` cells, `<tr className={TR}>`,
   outer box `className={TABLE_SHELL}`, identifier columns (folder no., MRN, bill no., attendance
   no., codes) `TD_MONO`, money cells `cn(TD, 'text-right')` + `cn(TH, 'text-right')`.
   `TD` carries `whitespace-nowrap` — for cells that legitimately hold long text (description,
   notes, address, clinical text) use `cn(TD, 'whitespace-normal')`. When rows become `TR`,
   delete `divide-y divide-[var(--border-color)]` from that `<tbody>` (TR draws the border).
7. **Never** concatenate constants in a template literal: `${TD} text-xs` does **not** override
   (plain CSS cascade decides, not string order). Always `cn(TD, 'text-xs')`.
8. Every `border`, `border-b`, `border-t` must be paired with `border-[var(--border-color)]`
   (Tailwind v4 defaults border colour to `currentColor`).
9. **Inputs.** `<input>` → `className={cn(INPUT, 'w-full')}`, `<select>` → `cn(SELECT, 'w-full')`,
   `<textarea>` → `cn(INPUT, 'w-full')`. A plain search box → `<SearchInput value onChange={setX}
   placeholder />`. Keep every `required`, validation rule and error message exactly as written.
   Native checkbox/radio styling stays.
10. **Status chips.** Where the page has a local status→colour or status→label helper, use
    `<Badge tone={statusTone(s)} dot size="sm">{humanStatus(s)}</Badge>` and delete the helper once
    unused. If a status value is missing from `Badge`'s `STATUS_TONES`, keep a small local tone map
    for it — **do not edit Badge**.
11. **Imports.** One consolidated import from the barrel. Add what you use; delete every lucide or
    helper import whose usage you removed (`noUnusedLocals` is on — a dangling import is a type
    error). Never leave an unused local function or variable.
12. **Palette.** No `bg-white`, `text-gray-*`, `bg-blue-100`, `text-red-600`, `bg-green-600` in
    JSX. Use the `var(--…)` tokens or the primitives. Never invent a new CSS variable. Do not
    touch string templates used by print/PDF generators.
13. **Forbidden.** Editing any file outside the ones assigned to you (never `components/ui/*`,
    `App.tsx`, `config/*`, `store/*`, `api/*`, `layouts/*`, other pages). Running a dev server,
    `vite dev`, `npm start`, `vite build` (peers are editing the same tree), or any database,
    seed or migration command. Committing or pushing.
14. **Verify.** From `frontend/`: `npx tsc --noEmit 2>&1 | grep -E "pages/(YourFiles)"` must be
    empty. The repo has ~839 pre-existing errors elsewhere — quote in your report any error that
    predates your edit and is unrelated to it. A syntax error (TS1xxx) anywhere in the repo masks
    every semantic error, so never finish with one in your files.
15. **Report** 6-12 lines: per file what you converted, what you deliberately left raw and why,
    and the filtered tsc result. No code in the report.
