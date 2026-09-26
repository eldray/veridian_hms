// src/components/PayslipEditor.tsx
import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import {
  X, Plus, Trash2, Save, DollarSign, TrendingUp, TrendingDown, Check, Clock, Pencil,
} from 'lucide-react';

const formatCedis = (v: number | string | undefined | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₵${(isNaN(n) ? 0 : n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CATEGORY_OPTIONS = {
  earning: [
    { value: 'base_salary', label: 'Base Salary' },
    { value: 'risk',        label: 'Risk Allowance' },
    { value: 'transport',   label: 'Transport Allowance' },
    { value: 'housing',     label: 'Housing Allowance' },
    { value: 'overtime',    label: 'Overtime' },
    { value: 'bonus',       label: 'Bonus' },
    { value: 'commission',  label: 'Commission' },
    { value: 'other',       label: 'Other Earning' },
  ],
  deduction: [
    { value: 'ssnit',   label: 'SSNIT' },
    { value: 'paye',    label: 'PAYE' },
    { value: 'loan',    label: 'Loan Repayment' },
    { value: 'advance', label: 'Salary Advance' },
    { value: 'late',    label: 'Late/Absence' },
    { value: 'other',   label: 'Other Deduction' },
  ],
};

interface Props {
  payslipId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PayslipEditor({ payslipId, onClose, onSaved }: Props) {
  const {
    getPayslipById,
    addPayslipLineItem, updatePayslipLineItem, deletePayslipLineItem,
    updatePayslip,
  } = useUserStore();
  const { success, error } = useToast();

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false); // tracks edits made

  const load = async () => {
    setLoading(true);
    try {
      const r = await getPayslipById(payslipId);
      setRecord(r);
    } catch (err: any) {
      error('Load failed', err?.response?.data?.message || 'Could not load payslip');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [payslipId]);

  const earnings = (record?.lineItems ?? []).filter((i: any) => i.type === 'earning');
  const deductions = (record?.lineItems ?? []).filter((i: any) => i.type === 'deduction');

  const sum = (arr: any[]) => arr.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const totalEarnings = sum(earnings);
  const totalDeductions = sum(deductions);
  const net = Math.max(0, totalEarnings - totalDeductions);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditBuffer({
      category: item.category,
      description: item.description ?? '',
      amount: String(item.amount ?? ''),
      taxable: item.taxable ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updatePayslipLineItem(payslipId, editingId, {
        category: editBuffer.category,
        description: editBuffer.description,
        amount: parseFloat(editBuffer.amount) || 0,
        taxable: editBuffer.taxable,
      });
      await load();
      setDirty(true);
      setEditingId(null);
      setEditBuffer({});
      success('Saved', 'Line item updated');
    } catch (err: any) {
      error('Save failed', err?.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const addLine = async (type: 'earning' | 'deduction') => {
    setSaving(true);
    try {
      await addPayslipLineItem(payslipId, {
        type,
        category: 'other',
        description: type === 'earning' ? 'Additional earning' : 'Additional deduction',
        amount: 0,
        taxable: type === 'earning',
      });
      await load();
      setDirty(true);
      success('Added', 'Fill in the values below');
    } catch (err: any) {
      error('Add failed', err?.response?.data?.message || 'Could not add');
    } finally {
      setSaving(false);
    }
  };

  const removeLine = async (lineItemId: string) => {
    if (!window.confirm('Remove this line item?')) return;
    setSaving(true);
    try {
      await deletePayslipLineItem(payslipId, lineItemId);
      await load();
      setDirty(true);
      success('Removed', 'Line item deleted');
    } catch (err: any) {
      error('Delete failed', err?.response?.data?.message || 'Could not remove');
    } finally {
      setSaving(false);
    }
  };

  const togglePaid = async () => {
    setSaving(true);
    try {
      await updatePayslip(payslipId, { isPaid: !record.isPaid });
      await load();
      setDirty(true);
      success('Updated', record.isPaid ? 'Marked pending' : 'Marked paid');
    } catch (err: any) {
      error('Update failed', err?.response?.data?.message || 'Could not update');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirty) onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl border border-[var(--border-color)] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[var(--bg-main)] px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Edit Payslip</h3>
              {record && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {record.staff?.user?.fullName} · {String(record.month).padStart(2, '0')}/{record.year}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-[var(--bg-card)]">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
{loading ? (
  <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading…</p>
) : !record ? (
  <div className="text-center py-8">
    <p className="text-sm text-[var(--icon-red-text)] mb-3">Could not load payslip details.</p>
    <button onClick={onClose} className="text-xs text-[var(--icon-cyan-text)] hover:underline">
      Close
    </button>
  </div>
) : (
  <>
              {/* EARNINGS */}
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--icon-green-text)] flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Earnings
                  </span>
                  <button
                    onClick={() => addLine('earning')}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {earnings.length === 0 && (
                    <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No earnings yet.</p>
                  )}
                  {earnings.map((item: any) => (
                    <LineRow
                      key={item.id}
                      item={item}
                      type="earning"
                      editing={editingId === item.id}
                      buffer={editBuffer}
                      setBuffer={setEditBuffer}
                      onEdit={() => startEdit(item)}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onRemove={() => removeLine(item.id)}
                      saving={saving}
                    />
                  ))}
                  <div className="px-4 py-2 bg-[var(--bg-main)] flex justify-between text-xs font-bold text-[var(--text-primary)]">
                    <span>Total Earnings</span>
                    <span>{formatCedis(totalEarnings)}</span>
                  </div>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                <div className="bg-[var(--bg-main)] px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--icon-red-text)] flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Deductions
                  </span>
                  <button
                    onClick={() => addLine('deduction')}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-text)] hover:text-white transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {deductions.length === 0 && (
                    <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No deductions yet.</p>
                  )}
                  {deductions.map((item: any) => (
                    <LineRow
                      key={item.id}
                      item={item}
                      type="deduction"
                      editing={editingId === item.id}
                      buffer={editBuffer}
                      setBuffer={setEditBuffer}
                      onEdit={() => startEdit(item)}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onRemove={() => removeLine(item.id)}
                      saving={saving}
                    />
                  ))}
                  <div className="px-4 py-2 bg-[var(--bg-main)] flex justify-between text-xs font-bold text-[var(--text-primary)]">
                    <span>Total Deductions</span>
                    <span>{formatCedis(totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* NET */}
              <div className="bg-[var(--icon-cyan-bg)] border border-[var(--icon-cyan-text)] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--icon-cyan-text)]">Net Pay</p>
                  <p className="text-2xl font-bold text-[var(--icon-cyan-text)] mt-1">{formatCedis(net)}</p>
                </div>
                <button
                  onClick={togglePaid}
                  disabled={saving}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                    record.isPaid
                      ? 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]'
                      : 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'
                  }`}
                >
                  {record.isPaid ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {record.isPaid ? 'Mark Pending' : 'Mark Paid'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-[var(--bg-main)] px-5 py-3 border-t border-[var(--border-color)] flex justify-end flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const LineRow: React.FC<{
  item: any;
  type: 'earning' | 'deduction';
  editing: boolean;
  buffer: any;
  setBuffer: (b: any) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
  saving: boolean;
}> = ({ item, type, editing, buffer, setBuffer, onEdit, onSave, onCancel, onRemove, saving }) => {
  const options = CATEGORY_OPTIONS[type];

  if (!editing) {
    return (
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-main)] transition-colors">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {item.description || item.category}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {options.find((o) => o.value === item.category)?.label || item.category}
            {item.taxable && ' · taxable'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCedis(item.amount)}</span>
          <button onClick={onEdit} className="p-1 text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] rounded" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} disabled={saving} className="p-1 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded disabled:opacity-50" title="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-[var(--icon-cyan-bg)] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">Category</label>
          <select
            value={buffer.category}
            onChange={(e) => setBuffer({ ...buffer, category: e.target.value })}
            className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)]"
          >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">Amount</label>
          <input
            type="number"
            step="0.01"
            value={buffer.amount}
            onChange={(e) => setBuffer({ ...buffer, amount: e.target.value })}
            className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)]"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">Description</label>
        <input
          type="text"
          value={buffer.description}
          onChange={(e) => setBuffer({ ...buffer, description: e.target.value })}
          placeholder="Optional label shown on payslip"
          className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)]"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={!!buffer.taxable}
            onChange={(e) => setBuffer({ ...buffer, taxable: e.target.checked })}
            className="rounded border-[var(--border-color)]"
          />
          Taxable
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={onCancel} disabled={saving} className="px-3 py-1.5 rounded text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="px-3 py-1.5 rounded text-xs font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};