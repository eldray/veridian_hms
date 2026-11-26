import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';

export type MedicalEntryEditType = 'diagnosis' | 'lab' | 'scan' | 'procedure' | 'medication';
type Props = { type: MedicalEntryEditType; entry: any; saving?: boolean; onClose: () => void; onSave: (data: any) => Promise<void> };

const title: Record<MedicalEntryEditType, string> = { diagnosis: 'Edit diagnosis', lab: 'Edit laboratory order', scan: 'Edit scan request', procedure: 'Edit procedure', medication: 'Edit prescription' };
const fieldCls = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)]';
const FREQUENCIES = [
  { value: 'once', label: 'Once daily' }, { value: 'bd', label: 'Twice daily (BD)' },
  { value: 'tds', label: 'Three times daily (TDS)' }, { value: 'qid', label: 'Four times daily (QID)' },
  { value: 'stat', label: 'STAT (immediately)' }, { value: 'prn', label: 'As needed (PRN)' },
  { value: 'nocte', label: 'At night (nocte)' }, { value: 'mane', label: 'In morning (mane)' },
];
const DURATION_OPTIONS = Array.from({ length: 30 }, (_, index) => {
  const days = index + 1;
  const value = days === 1 ? '24 hours' : days === 2 ? '48 hours' : `${days} days`;
  return { value, label: value };
});
const durationValue = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const hours = raw.match(/^(\d+)\s*(?:h|hr|hrs|hours?)$/i);
  if (hours) return `${Number(hours[1])} hours`;
  const days = raw.match(/^(\d+)\s*(?:d|day|days)$/i);
  if (days) return Number(days[1]) === 1 ? '24 hours' : Number(days[1]) === 2 ? '48 hours' : `${Number(days[1])} days`;
  return raw;
};
export const MedicalEntryEditModal: React.FC<Props> = ({ type, entry, saving = false, onClose, onSave }) => {
  const [values, setValues] = useState<any>({});
  useEffect(() => {
    setValues({
      diagnosisType: entry?.diagnosisType || (entry?.primary ? 'primary' : 'additional'),
      classification: entry?.classification || '',
      notes: entry?.notes || '',
      priority: entry?.priority || 'routine',
      scheduledDate: entry?.scheduledDate ? new Date(entry.scheduledDate).toISOString().slice(0,16) : '',
      dosage: entry?.dosage || '',
      frequency: entry?.frequency || '',
      duration: durationValue(entry?.duration),
      prnIndication: entry?.prnIndication || '',
      prnMaxDosesPerDay: entry?.prnMaxDosesPerDay ?? '',
      prnMinimumIntervalHours: entry?.prnMinimumIntervalHours ?? '',
    });
  }, [type, entry]);
  const set = (key: string, value: any) => setValues((old: any) => ({ ...old, [key]: value }));
  const field = (label: string, key: string, props: any = {}) => <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span><input className={fieldCls} value={values[key] ?? ''} onChange={e => set(key,e.target.value)} {...props}/></label>;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={onClose}/><div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
    <header className="flex items-center justify-between p-4 border-b border-[var(--border-color)]"><h2 className="text-sm font-bold text-[var(--text-primary)]">{title[type]}</h2><button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-main)] text-[var(--text-secondary)]" aria-label="Close"><X className="w-4 h-4"/></button></header>
    <div className="p-4 space-y-3">
      {type === 'diagnosis' && <>
        <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">Diagnosis type</span><select className={fieldCls} value={values.diagnosisType} onChange={e=>set('diagnosisType',e.target.value)}><option value="provisional">Provisional</option><option value="primary">Primary</option><option value="additional">Additional</option></select></label>
        <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">Case classification</span><select className={fieldCls} value={values.classification} onChange={e=>set('classification',e.target.value)}><option value="">Select classification</option><option value="NEW_DIAGNOSIS">New diagnosis</option><option value="OLD_DIAGNOSIS">Old diagnosis / re-attendance</option></select></label>
      </>}
      {(type === 'lab' || type === 'scan') && <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">Priority</span><select className={fieldCls} value={values.priority} onChange={e=>set('priority',e.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></label>}
      {type === 'procedure' && field('Scheduled date and time','scheduledDate',{type:'datetime-local'})}
      {type === 'medication' && <>
        {field('Dosage','dosage')}
        <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">Frequency</span><select className={fieldCls} value={values.frequency} onChange={e=>set('frequency',e.target.value)}><option value="">Select frequency</option>{FREQUENCIES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">Days</span><select className={fieldCls} value={values.duration} onChange={e=>set('duration',e.target.value)}><option value="">Select days</option>{DURATION_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {values.frequency === 'prn' && <>
          {field('PRN indication','prnIndication',{placeholder:'e.g. for pain or fever'})}
          {field('Maximum doses per day (optional)','prnMaxDosesPerDay',{type:'number',min:1,max:24,step:1})}
          {field('Minimum interval in hours (optional)','prnMinimumIntervalHours',{type:'number',min:1,max:24,step:1})}
        </>}
      </>}
      {type !== 'medication' && <label className="block space-y-1"><span className="text-xs font-medium text-[var(--text-secondary)]">Notes</span><textarea className={fieldCls} rows={4} value={values.notes} onChange={e=>set('notes',e.target.value)}/></label>}
    </div>
    <footer className="flex gap-2 p-4 border-t border-[var(--border-color)]"><button disabled={saving} onClick={()=>onSave(values)} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--icon-cyan-text)] text-white py-2 text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4"/>{saving?'Saving…':'Save changes'}</button><button onClick={onClose} className="px-4 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-secondary)]">Cancel</button></footer>
  </div></div>;
};
