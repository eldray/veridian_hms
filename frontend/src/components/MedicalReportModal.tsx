// src/components/MedicalReportModal.tsx
// The doctor completes a medical report for a visit, then prints it (A4). Fields are
// pre-filled from the visit's clinical notes; nothing is stored, the printout is the record.
import { useMemo, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { generatePDF, openPrintWindow } from '../utils/pdfGenerator';
import type { MedicalReportContent } from '../utils/pdfTemplates/medicalReportPDF';
import { useHospitalStore } from '../store/hospitalStore';
import { useAuthStore } from '../store/authStore';

interface Props {
  patient: any;
  attendance: any;
  onClose: () => void;
}

const field = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1';

const notesOf = (att: any): Record<string, any> => {
  let n = att?.clinicalNotes;
  if (typeof n === 'string') { try { n = JSON.parse(n); } catch { n = {}; } }
  return n && typeof n === 'object' && !Array.isArray(n) ? n : {};
};

export default function MedicalReportModal({ patient, attendance, onClose }: Props) {
  const { hospital } = useHospitalStore();
  const { user } = useAuthStore();
  const notes = useMemo(() => notesOf(attendance), [attendance]);

  const [form, setForm] = useState<MedicalReportContent>({
    addressee: '',
    purpose: '',
    history: notes.historyPresentingComplaint || '',
    examination: notes.physicalExamination || '',
    investigations: '',
    diagnosis: '',
    treatment: notes.plan || '',
    prognosis: '',
    fitness: '',
    unfitFrom: '',
    unfitTo: '',
    followUp: '',
    remarks: '',
    doctorName: user?.fullName || '',
    doctorRegNo: (user as any)?.licenseNumber || '',
    doctorTitle: '',
  });
  const set = (k: keyof MedicalReportContent) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const print = () => {
    const html = generatePDF('medicalReport', { report: { ...form, reportDate: new Date().toISOString() }, patient, attendance }, hospital);
    openPrintWindow(html, `Medical-Report-${attendance?.attendanceNumber || ''}`);
  };

  const text = (k: keyof MedicalReportContent, l: string, rows = 3, hint?: string) => (
    <div>
      <label className={label}>{l}</label>
      <textarea className={field} rows={rows} value={(form[k] as string) || ''} onChange={set(k)} placeholder={hint} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Medical report</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-main)]" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Addressed to</label>
              <input className={field} value={form.addressee || ''} onChange={set('addressee')} placeholder="Employer, insurer, court… (blank = Whom it may concern)" />
            </div>
            <div>
              <label className={label}>Report requested for</label>
              <input className={field} value={form.purpose || ''} onChange={set('purpose')} placeholder="e.g. Employment, insurance claim, visa" />
            </div>
          </div>
          {text('history', 'History', 3)}
          {text('examination', 'Examination findings', 3)}
          {text('investigations', 'Investigations (results relied upon)', 2)}
          {text('diagnosis', 'Diagnosis', 2, 'Leave blank to use the diagnoses recorded for this visit')}
          {text('treatment', 'Treatment', 2)}
          {text('prognosis', 'Prognosis and opinion', 2)}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>Fitness for duty</label>
              <select className={field} value={form.fitness || ''} onChange={set('fitness')}>
                <option value="">Not applicable</option>
                <option value="fit">Fit for normal duties</option>
                <option value="fit_light_duties">Fit for light duties only</option>
                <option value="unfit">Unfit for duty</option>
              </select>
            </div>
            <div><label className={label}>From</label><input type="date" className={field} value={form.unfitFrom || ''} onChange={set('unfitFrom')} /></div>
            <div><label className={label}>To</label><input type="date" className={field} value={form.unfitTo || ''} onChange={set('unfitTo')} /></div>
          </div>
          <div>
            <label className={label}>Review / follow-up</label>
            <input className={field} value={form.followUp || ''} onChange={set('followUp')} placeholder="e.g. Review in 2 weeks" />
          </div>
          {text('remarks', 'Further remarks', 2)}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-color)]">
            <div><label className={label}>Doctor</label><input className={field} value={form.doctorName || ''} onChange={set('doctorName')} /></div>
            <div><label className={label}>Designation</label><input className={field} value={form.doctorTitle || ''} onChange={set('doctorTitle')} placeholder="Medical Officer" /></div>
            <div><label className={label}>Registration no.</label><input className={field} value={form.doctorRegNo || ''} onChange={set('doctorRegNo')} /></div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-color)]">
          <button onClick={onClose} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">Cancel</button>
          <button onClick={print} className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-bg)] px-4 py-2 text-sm font-medium text-[var(--icon-cyan-text)] hover:opacity-80">
            <Printer className="w-4 h-4" /> Print report
          </button>
        </div>
      </div>
    </div>
  );
}
