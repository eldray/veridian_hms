// Shared building blocks for the claim edit screens (NHIS / Private / Corporate).
// Layout follows the NHIA "UPDATE CLAIM" form: teal section cards, underlined fields,
// numbered teal bars for Diagnoses / Investigations / Medicines, Cancel / SAVE footer.
import React from 'react';
import { ChevronsDown, Lock, X, Check, Search, Calendar } from 'lucide-react';

export const TEAL = '#009688';

export const ClaimFrame: React.FC<{
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  onClose: () => void;
  onFinalize?: () => void;
  finalizing?: boolean;
  onCollapse?: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, status, onClose, onFinalize, finalizing, onCollapse, children }) => (
  <div className="min-h-screen bg-gray-100 py-6 px-3">
    <div className="max-w-[980px] mx-auto bg-white border border-gray-300 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
        <div>
          <h1 className="text-[22px] tracking-wide text-gray-800 uppercase">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {status}
          {onCollapse && (
            <button type="button" onClick={onCollapse} title="Collapse / expand tables" className="w-12 h-9 border border-gray-300 rounded text-gray-500 hover:bg-gray-50 flex items-center justify-center">
              <ChevronsDown className="w-4 h-4" />
            </button>
          )}
          {onFinalize && (
            <button type="button" onClick={onFinalize} disabled={finalizing} title="Save & finalize (lock claim)" className="w-12 h-9 border border-gray-300 rounded text-gray-500 hover:bg-gray-50 flex items-center justify-center disabled:opacity-50">
              <Lock className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={onClose} title="Close" className="w-12 h-9 border border-gray-300 rounded text-gray-500 hover:bg-gray-50 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-5 space-y-5 bg-gray-50">{children}</div>
    </div>
  </div>
);

export const ClaimCard: React.FC<{ title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, action, className = '', children }) => (
  <section className={`bg-white shadow-sm ${className}`}>
    <div className="px-4 py-2.5 text-white text-sm font-medium flex items-center justify-between" style={{ background: TEAL }}>
      <span>{title}</span>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

/** Label above, value below, dotted underline – like the NHIA inputs. */
export const UField: React.FC<{
  label: string; value: string; onChange?: (v: string) => void; type?: string; disabled?: boolean; placeholder?: string;
  icon?: 'search' | 'calendar'; hint?: string; className?: string;
}> = ({ label, value, onChange, type = 'text', disabled, placeholder, icon, hint, className = '' }) => (
  <div className={className}>
    <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
    <div className={`flex items-center border-b border-dotted ${disabled ? 'border-gray-300' : 'border-gray-400'}`}>
      <input
        type={type}
        value={value}
        placeholder={placeholder ?? label}
        disabled={disabled || !onChange}
        onChange={e => onChange?.(e.target.value)}
        className="w-full bg-transparent py-1.5 text-[15px] text-gray-600 placeholder-gray-400 focus:outline-none disabled:text-gray-500"
      />
      {icon === 'search' && <Search className="w-3.5 h-3.5 text-gray-400" />}
      {icon === 'calendar' && <Calendar className="w-3.5 h-3.5 text-gray-500" />}
    </div>
    {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
  </div>
);

export const CheckItem: React.FC<{ label: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
  <label className={`inline-flex items-center gap-2 text-[15px] ${disabled ? 'text-gray-400' : 'text-gray-600 cursor-pointer'}`}>
    <span
      className="w-5 h-5 border rounded-sm flex items-center justify-center shrink-0"
      style={checked ? { background: '#80cbc4', borderColor: '#80cbc4' } : { borderColor: '#bdbdbd' }}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white" />}
    </span>
    <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={e => onChange?.(e.target.checked)} />
    {label}
  </label>
);

/** Numbered teal bar with an optional table body ("2 DIAGNOSES"). */
export const ListSection: React.FC<{
  n?: number; title: string; count: number; emptyText?: string; action?: React.ReactNode; open?: boolean; children?: React.ReactNode;
}> = ({ n, title, count, emptyText, action, open = true, children }) => {
  if (count === 0 && emptyText) {
    return (
      <div className="text-white text-sm px-4 py-2.5 flex items-center justify-between" style={{ background: TEAL }}>
        <span className="uppercase">{emptyText}</span>
        {action}
      </div>
    );
  }
  return (
    <section className="bg-white shadow-sm">
      <div className="text-white text-sm px-4 py-2.5 flex items-center justify-between uppercase" style={{ background: TEAL }}>
        <span>{count} {title}</span>
        {action}
      </div>
      {open && <div className="overflow-x-auto px-1 pb-2">{children}</div>}
    </section>
  );
};

export const TH: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-3 py-3 text-left text-[12px] font-normal uppercase text-gray-500 ${className}`}>{children}</th>
);

export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[12px] leading-snug text-justify" style={{ color: '#8d6e2f' }}>{children}</p>
);

export const ClaimFooter: React.FC<{ onCancel: () => void; onSave?: () => void; saving?: boolean; saveLabel?: string; extra?: React.ReactNode }> = ({ onCancel, onSave, saving, saveLabel = 'SAVE', extra }) => (
  <div className="flex justify-end items-center gap-3 pt-4 bg-white px-5 py-4 border-t border-gray-200">
    {extra}
    <button type="button" onClick={onCancel} className="px-8 py-2 border rounded text-[15px] hover:bg-red-50" style={{ borderColor: '#ef9a9a', color: '#e57373' }}>Cancel</button>
    {onSave && (
      <button type="button" onClick={onSave} disabled={saving} className="px-6 py-2 border rounded text-[15px] flex items-center gap-2 hover:bg-blue-50 disabled:opacity-50" style={{ borderColor: '#4a7ca8', color: '#3a6a96' }}>
        <Check className="w-4 h-4" /> {saving ? 'SAVING…' : saveLabel}
      </button>
    )}
  </div>
);

export const SPECIALTIES = ['ASUR', 'DENT', 'ENTH', 'MEDI', 'OBGY', 'OPDC', 'OPHT', 'ORTH', 'PAED', 'PSUR', 'RSUR'] as const;

export const ATTENDANCE_OPTIONS: { code: string; label: string }[] = [
  { code: 'CFU', label: 'Chronic Follow-up' },
  { code: 'EAE', label: 'Emergency/Acute Episode' },
  { code: 'ANC', label: 'Ante-natal' },
  { code: 'PNC', label: 'Post-natal' },
];

export const fmtDate = (d?: string | Date | null) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(+x) ? String(d) : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
