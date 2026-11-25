// A GHSS/NHIS membership number is 8 digits, or those same 8 digits written in a 10-digit
// field with a "00" prefix. The backend enforces the same rule in PatientService, so this is
// the fast local echo of it.

export const isNhisNumberValid = (raw?: string | null): boolean =>
  /^\d{8}$|^00\d{8}$/.test(String(raw ?? '').trim());

export const nhisNumberError = (raw?: string | null): string | null => {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) return 'NHIS number must be digits only - no letters, spaces or dashes.';
  if (value.length === 8) return null;
  if (value.length === 10) return /^00\d{8}$/.test(value) ? null : 'A 10-digit NHIS number is the 8-digit number with a 00 prefix.';
  return `NHIS number must be 8 or 10 digits - this one has ${value.length}.`;
};

/** Keeps a keystroke-restricted input to digits, capped at the longest valid number. */
export const sanitizeNhisInput = (raw: string): string => raw.replace(/\D/g, '').slice(0, 10);
