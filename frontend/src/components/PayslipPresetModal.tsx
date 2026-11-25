// src/components/PayslipPresetModal.tsx
// Set / edit a staff member's payslip values BEFORE payroll is run.
// Saved as a draft via presetPayslip(). Run Payroll must leave an
// existing draft alone — it only generates for staff with no record.
import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import type { Payslip } from '../store/userStore';

interface DraftLine {
  id: string;
  type: 'earning' | 'deduction';
  category: string;
  description: string;
  amount: number;
  taxable: boolean;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatCedis = (v: number) =>
  `₵${(isNaN(v) ? 0 : v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const defaultLines = (baseSalary: number): DraftLine[] => [
  { id: uid(), type: 'earning', category: 'Base Salary', description: 'Monthly base salary', amount: baseSalary, taxable: true },
  { id: uid(), type: 'earning', category: 'Risk Allowance', description: '', amount: 450, taxable: true },
  { id: uid(), type: 'earning', category: 'Transport Allowance', description: '', amount: 200, taxable: true },
  { id: uid(), type: 'deduction', category: 'SSNIT', description: 'Employee SSNIT contribution', amount: 0, taxable: false },
  { id: uid(), type: 'deduction', category: 'PAYE', description: 'Income tax', amount: 0, taxable: false },
];

interface Props {
  userId: string;
  userName: string;
  month: number;
  year: number;
  existingPayslip?: Payslip | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PayslipPresetModal({ userId, userName, month, year, existingPayslip, onClose, onSaved }: Props) {
  const { presetPayslip, getPayslipById } = useUserStore();
  const { success, error: toastError } = useToast();

  const [lines, setLines] = useState<DraftLine[]>(() =>
    defaultLines(Number(existingPayslip?.baseSalary ?? 0) || 0),
  );
  const [notes, setNotes] = useState(existingPayslip?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // If a draft already exists for this period, pre-fill from its line items.
  useEffect(() => {
    if (!existingPayslip) return;
    if (existingPayslip.lineItems && existingPayslip.lineItems.length > 0) {
      setLines(
        existingPayslip.lineItems.map((li) => ({
          id: li.id,
          type: li.type,
          category: li.category,
          description: li.description ?? '',
          amount: Number(li.amount) || 0,
          taxable: li.taxable,
        })),
      );
      setNotes(existingPayslip.notes ?? '');
      return;
    }
    // Draft exists but has no line items yet — fetch the full record once.
    let cancelled = false;
    setLoading(true);
    getPayslipById(existingPayslip.id)
      .then((full) => {
        if (cancelled) return;
        if (full?.lineItems?.length) {
          setLines(
            full.lineItems.map((li: any) => ({
              id: li.id,
              type: li.type,
              category: li.category,
              description: li.description ?? '',
              amount: Number(li.amount) || 0,
              taxable: li.taxable,
            })),
          );
        } else {
          setLines(defaultLines(Number(full?.baseSalary ?? existingPayslip.baseSalary ?? 0) || 0));
        }
        setNotes(full?.notes ?? existingPayslip.notes ?? '');
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPayslip?.id]);

  const totals = useMemo(() => {
    const earnings = lines.filter((l) => l.type === 'earning').reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const deductions = lines.filter((l) => l.type === 'deduction').reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const base = lines.find((l) => l.category.trim().toLowerCase() === 'base salary')?.amount ?? 0;
    return { earnings, deductions, net: earnings - deductions, base: Number(base) || 0, allowances: earnings - (Number(base) || 0) };
  }, [lines]);

  const updateLine = (id: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = (type: 'earning' | 'deduction') =>
    setLines((prev) => [...prev, { id: uid(), type, category: '', description: '', amount: 0, taxable: type === 'earning' }]);

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const handleSave = async () => {
    const cleaned = lines
      .map((l) => ({ ...l, category: l.category.trim(), amount: Number(l.amount) || 0 }))
      .filter((l) => l.category !== '');
    if (cleaned.length === 0) {
      toastError('Nothing to save', 'Add at least one line item');
      return;
    }
    setSaving(true);
    try {
      await presetPayslip(userId, month, year, {
        baseSalary: totals.base,
        allowances: totals.allowances,
        deductions: totals.deductions,
        notes: notes.trim() || null,
        lineItems: cleaned.map((l) => ({
          type: l.type,
          category: l.category,
          description: l.description.trim() || undefined,
          amount: l.amount,
          taxable: l.taxable,
        })),
      });
      success('Payslip values saved', `Draft for ${month}/${year} — net ${formatCedis(totals.net)}`);
      onSaved();
      onClose();
    } catch (err: any) {
      toastError('Save failed', err?.response?.data?.message || 'Could not save payslip values');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl max-h- flex flex-col border border-[var(--border-color)]">
        <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {existingPayslip ? 'Edit Payslip Values' : 'Set Payslip Values Before Run'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {userName} · {String(month).padStart(2, '0')}/{year}
              {existingPayslip ? ' · draft already exists — Run Payroll will leave it alone' : ' · saved as a draft, Run Payroll will not overwrite it'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-card)]">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading existing values…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-[var(--bg-main)] rounded-lg">
                  <p className="text- text-[var(--text-secondary)]">Gross Earnings</p>
                  <p className="font-bold text-[var(--text-primary)]">{formatCedis(totals.earnings)}</p>
                </div>
                <div className="p-3 bg-[var(--bg-main)] rounded-lg">
                  <p className="text- text-[var(--text-secondary)]">Deductions</p>
                  <p className="font-bold text-[var(--icon-red-text)]">{formatCedis(totals.deductions)}</p>
                </div>
                <div className="p-3 bg-[var(--bg-main)] rounded-lg">
                  <p className="text- text-[var(--text-secondary)]">Net Pay</p>
                  <p className="font-bold text-[var(--icon-green-text)]">{formatCedis(totals.net)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.id} className="flex flex-wrap gap-2 items-center">
                    <select
                      value={line.type}
                      onChange={(e) => updateLine(line.id, { type: e.target.value as 'earning' | 'deduction' })}
                      className="px-2 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                    >
                      <option value="earning">Earning</option>
                      <option value="deduction">Deduction</option>
                    </select>
                    <input
                      type="text"
                      value={line.category}
                      onChange={(e) => updateLine(line.id, { category: e.target.value })}
                      placeholder="Category e.g. Base Salary"
                      className="flex-1 min-w- px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.amount}
                      onChange={(e) => updateLine(line.id, { amount: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-28 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] text-right"
                    />
                    <button onClick={() => removeLine(line.id)} className="p-2 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded" title="Remove line">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => addLine('earning')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
                  <Plus className="w-3.5 h-3.5" /> Add Earning
                </button>
                <button onClick={() => addLine('deduction')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]">
                  <Plus className="w-3.5 h-3.5" /> Add Deduction
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Values'}
          </button>
        </div>
      </div>
    </div>
  );
}