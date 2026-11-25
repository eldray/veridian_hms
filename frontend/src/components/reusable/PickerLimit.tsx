// Search pickers used to mount every matching catalogue row. With a few thousand
// diagnoses, services or stock items loaded, opening a dropdown — and then every
// keystroke in its search box — rebuilt that many nodes and stalled the renderer.
export const MAX_PICKER_ROWS = 50;

export const capPickerRows = <T,>(matches: T[]): T[] => matches.slice(0, MAX_PICKER_ROWS);

export function PickerRowsHint({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <div className="px-2 py-1.5 text-center text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
      Showing {shown} of {total} &mdash; keep typing to narrow the list
    </div>
  );
}
