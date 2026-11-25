// Shared, non-component helpers for the counter screens (dashboard, new ticket, ticket).
//
// A counter ticket is an Attendance whose identity is a CounterClient instead of a
// Patient, so the same projections and status wording are read by three pages now.
import { formatCurrency } from './currency';
import { humanStatus, statusTone, type Accent, type BadgeTone } from '../components/ui';

export const unwrap = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export const pickList = (record: any, keys: string[]): any[] => {
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

export const money = (value: any) => formatCurrency(value);

export const dateTime = (value: any) => (value ? new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export const label = (value: any) => String(value ?? '').replace(/_/g, ' ');

// The API answers with Prisma's relation names, lower-cased by the response
// normaliser, so both spellings are tried rather than silently showing nothing.
export const LIST_KEYS = {
  medications: ['medication', 'Medication', 'medications'],
  labs: ['labTest', 'LabTest', 'labTests'],
  scans: ['scan', 'Scan', 'scans'],
};

/**
 * The statuses that stop every ticket write.
 *
 * This is the set backend CounterService.requireOpenTicket refuses on — not just
 * completed/cancelled — so a button here never offers an action the server answers with 409.
 */
export const CLOSED_STATUSES = ['completed', 'cancelled', 'discharged', 'referred', 'absconded'];

/** Orders the counter can still delete outright: never started, or already cancelled (to purge). */
export const CANCELLABLE_ORDER_STATUSES = ['requested', 'cancelled'];

export const openedByLabel = (ticket: any): string =>
  ticket?.openedBy
  || ticket?.user_Attendance_createdByIdToUser?.fullName
  || ticket?.User_Attendance_createdByIdToUser?.fullName
  || '';

export const identityOf = (ticket: any) => {
  const client = ticket?.counterClient || ticket?.CounterClient || null;
  const patient = ticket?.patient || ticket?.Patient || null;
  if (client) return { label: client.name, detail: client.ageYears != null ? `${client.ageYears} years` : 'age not given', phone: client.phone || 'no phone', kind: 'walk_in' as const, client, patient };
  if (patient) {
    const name = `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Registered patient';
    return { label: name, detail: `Folder ${patient.folderNumber || '—'}`, phone: patient.contact || 'no phone', kind: 'patient' as const, client, patient };
  }
  return { label: 'Unnamed customer', detail: '—', phone: '—', kind: 'walk_in' as const, client, patient };
};

// The only ticket statuses Badge's STATUS_TONES does not carry: keep their
// local colours here rather than editing the shared primitive (rule R13).
const LOCAL_TONES: Record<string, Accent> = {
  requested: 'yellow',
  prescribed: 'yellow',
  administered: 'green',
};

export const ticketTone = (value: any): BadgeTone => {
  const key = label(value).toLowerCase();
  return LOCAL_TONES[key] ?? statusTone(key);
};

export const ticketLabel = (value: any): string => (value ? humanStatus(value) : 'unknown');

export const shell = 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm';
