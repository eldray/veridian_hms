// src/components/PrintFormatToggle.tsx
// Lets a workstation choose A4 page or receipt-printer slip for a kind of document.
// The choice is remembered on this PC (each PC has its own printer), so every print button just obeys it.
import { useState } from 'react';
import { SELECT } from './ui';

export type PrintableDoc = 'prescription' | 'lab';
export type PrintFormat = 'a4' | 'slip';

const key = (doc: PrintableDoc) => `print.format.${doc}`;

/** Current format for a document type on this PC; A4 until someone picks otherwise. */
export const getPrintFormat = (doc: PrintableDoc): PrintFormat => {
  try { return localStorage.getItem(key(doc)) === 'slip' ? 'slip' : 'a4'; } catch { return 'a4'; }
};

export function PrintFormatToggle({ doc, className = '' }: { doc: PrintableDoc; className?: string }) {
  const [value, setValue] = useState<PrintFormat>(() => getPrintFormat(doc));
  return (
    <select
      aria-label="Print format"
      title="Print on an A4 page or on a receipt-printer slip (remembered on this PC)"
      className={`${SELECT} w-auto ${className}`}
      value={value}
      onChange={(e) => {
        const next = e.target.value === 'slip' ? 'slip' : 'a4';
        setValue(next);
        try { localStorage.setItem(key(doc), next); } catch { /* storage blocked: applies to this session's selector only */ }
      }}
    >
      <option value="a4">A4 page</option>
      <option value="slip">Receipt slip</option>
    </select>
  );
}
