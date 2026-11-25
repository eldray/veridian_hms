/**
 * Formats a medication row into the prescription text expected by the NHIS XML
 * sample: "{dosage} {FREQ} X {duration}"
 *
 * Examples from the sample:
 *   "1 DLY X 30 Days"
 *   "5mg DLY X 30 Days"
 *   "30g TDS X 5 Days"
 *   "500ml ST X 24HRS"
 *   "625mg BD X 7 Days"
 */

const FREQUENCY_MAP: Record<string, string> = {
  once: 'DLY',
  dly: 'DLY',
  od: 'DLY',
  bd: 'BD',
  tds: 'TDS',
  qid: 'QID',
  stat: 'ST',
  st: 'ST',
  prn: 'PRN',
  nocte: 'NOCTE',
  mane: 'MANE',
};

export interface MedicationForFormatter {
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
}

export function formatPrescription(med: MedicationForFormatter): string {
  const dosage = (med.dosage ?? '').trim();
  const freqRaw = (med.frequency ?? '').trim();
  const duration = normalizeDuration(med.duration ?? '');

  const freq = normalizeFrequency(freqRaw);

  const parts: string[] = [];
  if (dosage) parts.push(dosage);
  if (freq) parts.push(freq);
  if (duration) parts.push(`X ${duration}`);

  return parts.join(' ').trim();
}

function normalizeFrequency(freq: string): string {
  if (!freq) return '';
  const key = freq.toLowerCase();
  return FREQUENCY_MAP[key] ?? freq.toUpperCase();
}

function normalizeDuration(duration: string): string {
  const trimmed = duration.trim();
  if (!trimmed) return '';
  // Bare number → append "Days"
  if (/^\d+$/.test(trimmed)) return `${trimmed} Days`;
  // Preserve casing of unit, but normalise "days"/"DAYS"/"dys" → "Days"
  const match = trimmed.match(/^(\d+)\s*(.*)$/);
  if (!match) return trimmed;
  const [, num, unit] = match;
  const unitLower = unit.toLowerCase();
  if (unitLower === 'day' || unitLower === 'days' || unitLower === 'dys' || unitLower === 'd') {
    return `${num} Days`;
  }
  if (unitLower === 'hr' || unitLower === 'hrs' || unitLower === 'hour' || unitLower === 'hours') {
    return `${num}HRS`;
  }
  if (unitLower === 'week' || unitLower === 'weeks' || unitLower === 'wk' || unitLower === 'wks') {
    return `${num} Weeks`;
  }
  if (unitLower === 'month' || unitLower === 'months') {
    return `${num} Months`;
  }
  return `${num} ${unit}`.trim();
}