import React, { useMemo, useState } from 'react';

export interface PrescriptionDetails {
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

const FREQUENCIES = [
  ['once', 'Once daily'], ['bd', 'Twice daily (BD)'], ['tds', 'Three times daily (TDS)'],
  ['qid', 'Four times daily (QID)'], ['stat', 'STAT (immediately)'], ['prn', 'As needed (PRN)'],
  ['nocte', 'At night (nocte)'], ['mane', 'In morning (mane)'],
];

const ROUTES = [
  ['oral', 'Oral'], ['iv', 'Intravenous (IV)'], ['im', 'Intramuscular (IM)'],
  ['sc', 'Subcutaneous'], ['topical', 'Topical'], ['inhalation', 'Inhalation'],
  ['rectal', 'Rectal'], ['sublingual', 'Sublingual'], ['nasal', 'Nasal'],
  ['ophthalmic', 'Eye'], ['otic', 'Ear'], ['vaginal', 'Vaginal'],
];

export const EMPTY_PRESCRIPTION: PrescriptionDetails = {
  dosage: '', frequency: '', duration: '', route: 'oral', instructions: '',
};

export function formatPrescriptionDetails(value: PrescriptionDetails): string {
  return [
    value.dosage && `Dose: ${value.dosage}`,
    value.frequency && `Frequency: ${value.frequency}`,
    value.duration && `Duration: ${value.duration}`,
    value.route && `Route: ${ROUTES.find(([key]) => key === value.route)?.[1] || value.route}`,
    value.instructions && `Instructions: ${value.instructions}`,
  ].filter(Boolean).join(' · ');
}

export function parsePrescriptionDetails(text?: string | null): PrescriptionDetails {
  const result = { ...EMPTY_PRESCRIPTION };
  if (!text) return result;
  const parts = text.split(/\s*·\s*/);
  for (const part of parts) {
    const match = part.match(/^(Dose|Frequency|Duration|Route|Instructions):\s*(.*)$/i);
    if (!match) {
      if (!result.instructions) result.instructions = part;
      continue;
    }
    const key = match[1].toLowerCase();
    const val = match[2].trim();
    if (key === 'dose') result.dosage = val;
    if (key === 'frequency') result.frequency = val;
    if (key === 'duration') result.duration = val;
    if (key === 'route') result.route = ROUTES.find(([, label]) => label.toLowerCase() === val.toLowerCase())?.[0] || val.toLowerCase();
    if (key === 'instructions') result.instructions = val;
  }
  return result;
}

function dosageSuggestions(strength?: string): string[] {
  const value = strength?.trim() || '';
  const liquid = value.match(/^(\d+(?:\.\d+)?)\s*(mcg|μg|ug|mg|g|iu|units?)\s*(?:\/|per)\s*(\d+(?:\.\d+)?)\s*ml$/i);
  if (liquid) {
    const baseVolume = Number(liquid[3]);
    return [0.5, 1, 1.5, 2, 2.5, 3].map(multiplier => {
      const amount = baseVolume * multiplier;
      return `${Number.isInteger(amount) ? amount : Number(amount.toFixed(2))} mL`;
    });
  }
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(mcg|μg|ug|mg|g|iu|units?)$/i);
  if (!match) return [];
  const base = Number(match[1]);
  const unit = match[2].toLowerCase() === 'μg' ? 'mcg' : match[2].toLowerCase();
  return [0.5, 1, 1.5, 2, 2.5, 3].map(multiplier => {
    const amount = base * multiplier;
    return `${Number.isInteger(amount) ? amount : Number(amount.toFixed(2))} ${unit}`;
  });
}

const inputClass = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-green-text)]';

export function PrescriptionFields({ value, onChange, strength }: {
  value: PrescriptionDetails;
  onChange: (next: PrescriptionDetails) => void;
  strength?: string;
}) {
  const [durationSearch, setDurationSearch] = useState(value.duration || '');
  const [showDurations, setShowDurations] = useState(false);
  const durations = useMemo(() => [...Array.from({ length: 30 }, (_, i) => i + 1), 60, 90]
    .map(days => days === 1 ? '24 hours' : days === 2 ? '48 hours' : `${days} days`)
    .filter(option => option.toLowerCase().includes(durationSearch.toLowerCase())), [durationSearch]);
  const suggestions = useMemo(() => dosageSuggestions(strength), [strength]);
  const set = (patch: Partial<PrescriptionDetails>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
      <div className="text-xs font-semibold text-[var(--text-primary)]">Prescription details</div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Dosage</label>
        <input className={inputClass} value={value.dosage} onChange={e => set({ dosage: e.target.value })} placeholder="e.g. 500 mg or 5 mL" />
        {suggestions.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{suggestions.map(option => <button type="button" key={option} onClick={() => set({ dosage: option })} className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]">{option}</button>)}</div>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Frequency</label>
          <select className={inputClass} value={value.frequency} onChange={e => set({ frequency: e.target.value })}>
            <option value="">Select frequency</option>
            {FREQUENCIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Duration / Days</label>
          <input className={inputClass} value={durationSearch} onFocus={() => setShowDurations(true)} onChange={e => { setDurationSearch(e.target.value); setShowDurations(true); set({ duration: e.target.value }); }} placeholder="Search or enter days" />
          {showDurations && <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg">
            {durations.map(option => <button type="button" key={option} onClick={() => { set({ duration: option }); setDurationSearch(option); setShowDurations(false); }} className="block w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-main)]">{option}</button>)}
            {durations.length === 0 && <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">Custom duration will be used</div>}
          </div>}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Route</label>
        <select className={inputClass} value={value.route} onChange={e => set({ route: e.target.value })}>
          {ROUTES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Instructions (optional)</label>
        <textarea className={inputClass} rows={2} value={value.instructions} onChange={e => set({ instructions: e.target.value })} placeholder="Additional administration instructions…" />
      </div>
    </div>
  );
}
