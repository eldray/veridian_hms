import React from 'react';
import { Printer, X, ShieldCheck, Phone, MapPin, CalendarDays, CreditCard } from 'lucide-react';
import { useHospitalStore } from '../../store/hospitalStore';

interface PatientIdCardPrintProps {
  patient: any;
  onClose: () => void;
}

const safeDate = (value: unknown) => {
  if (!value) return 'Not recorded';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const patientName = (patient: any) =>
  [patient?.surname, patient?.otherNames].filter(Boolean).join(' ').trim()
  || patient?.fullName || patient?.name || 'Patient';

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT';

export default function PatientIdCardPrint({ patient, onClose }: PatientIdCardPrintProps) {
  const { hospital } = useHospitalStore();
  const name = patientName(patient);
  const hospitalName = hospital?.name || 'Hospital';
  const hospitalAddress = hospital?.address || '';
  const hospitalPhone = hospital?.phone || '';
  const nhisNumber = patient?.nhisNumber || patient?.additionalInfo?.nhisNumber || '';
  const nhisExpiry = patient?.nhisExpiryDate || patient?.additionalInfo?.nhisExpiryDate;
  const folderNumber = patient?.folderNumber || patient?.id || 'Not assigned';
  const dob = safeDate(patient?.dateOfBirth);
  const logo = (hospital as any)?.logoUrl || (hospital as any)?.imageUrl;
  const registered = safeDate(patient?.registeredAt || patient?.createdAt);
  const address = patient?.address || patient?.residenceCommunity || 'Address not recorded';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6">
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          body * { visibility: hidden !important; }
          #patient-id-card-print, #patient-id-card-print * { visibility: visible !important; }
          #patient-id-card-print {
            position: absolute !important; inset: 0 auto auto 0 !important;
            width: 100% !important; min-height: 0 !important; padding: 8mm !important;
            margin: 0 !important; background: #fff !important; overflow: visible !important;
          }
          #patient-id-card-print .patient-id-card-screen-actions { display: none !important; }
          #patient-id-card-print .patient-id-card-sheet {
            display: flex !important; flex-direction: row !important; justify-content: center !important;
            align-items: flex-start !important; gap: 8mm !important; padding: 0 !important;
            background: #fff !important; box-shadow: none !important;
          }
          #patient-id-card-print .patient-id-card {
            width: 85.6mm !important; height: 54mm !important; min-width: 85.6mm !important;
            max-width: 85.6mm !important; border-radius: 3mm !important; overflow: hidden !important;
            box-shadow: none !important; break-inside: avoid !important; -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #patient-id-card-print .card-back { border: .25mm solid #cbd5e1 !important; }
        }
      `}</style>

      <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" id="patient-id-card-print">
        <div className="patient-id-card-screen-actions sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-base font-bold text-slate-900">Patient ID card</h2>
            <p className="text-xs text-slate-500">Print both sides on card stock, then cut along the card edges.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close preview"><X className="h-4 w-4" /></button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Printer className="h-4 w-4" /> Print ID card</button>
          </div>
        </div>

        <div className="patient-id-card-sheet flex flex-col items-center gap-6 bg-slate-100 p-5 sm:flex-row sm:justify-center sm:items-start">
          <section className="patient-id-card relative flex h-[204px] w-[324px] max-w-full shrink-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-[#082f49] via-[#0e526c] to-[#087e83] text-white shadow-xl">
            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border-[18px] border-white/5" />
            <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full border-[22px] border-cyan-200/10" />
            <header className="relative flex items-center gap-2 border-b border-white/15 px-4 py-3">
              {logo ? <img src={logo} alt="" className="h-8 w-8 rounded-md bg-white object-contain p-0.5" /> : <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15"><ShieldCheck className="h-5 w-5 text-cyan-100" /></div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-extrabold uppercase tracking-[.12em]">{hospitalName}</p>
                <p className="text-[7px] font-semibold uppercase tracking-[.2em] text-cyan-100">Official patient identification</p>
              </div>
              <span className="rounded-full border border-white/25 px-2 py-1 text-[7px] font-bold tracking-widest">PATIENT</span>
            </header>
            <div className="relative flex min-h-0 flex-1 gap-3 px-4 py-3">
              {patient?.imageUrl ? <img src={patient.imageUrl} alt={name} className="h-[82px] w-[66px] shrink-0 rounded-md border-2 border-white/70 bg-white object-cover" /> : <div className="flex h-[82px] w-[66px] shrink-0 items-center justify-center rounded-md border-2 border-white/50 bg-white/15 text-xl font-black tracking-wider">{initials(name)}</div>}
              <div className="min-w-0 flex-1">
                <p className="text-[7px] font-semibold uppercase tracking-widest text-cyan-100">Patient name</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] font-extrabold leading-tight">{name}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div><p className="text-[7px] uppercase tracking-wider text-cyan-100">Folder number</p><p className="text-[10px] font-bold">{folderNumber}</p></div>
                  <div><p className="text-[7px] uppercase tracking-wider text-cyan-100">Gender</p><p className="text-[10px] font-bold capitalize">{patient?.gender || '—'}</p></div>
                  <div><p className="text-[7px] uppercase tracking-wider text-cyan-100">Date of birth</p><p className="text-[10px] font-bold">{dob}</p></div>
                  <div><p className="text-[7px] uppercase tracking-wider text-cyan-100">Contact</p><p className="truncate text-[10px] font-bold">{patient?.contact || patient?.phoneNumber || '—'}</p></div>
                </div>
              </div>
            </div>
            <footer className="relative flex items-center justify-between border-t border-white/15 bg-black/10 px-4 py-2">
              <span className="text-[7px] font-semibold uppercase tracking-widest text-cyan-100">Present this card at every visit</span>
              <span className="text-[8px] font-bold tracking-wider">VERIDIAN HMS</span>
            </footer>
          </section>

          <section className="patient-id-card card-back relative flex h-[204px] w-[324px] max-w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-800">{hospitalName}</p><p className="mt-0.5 text-[7px] font-semibold uppercase tracking-widest text-teal-700">Patient information</p></div>
              <CreditCard className="h-5 w-5 text-teal-700" />
            </header>
            <div className="flex-1 space-y-2 px-4 py-3">
              <div><p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">NHIS / Insurance number</p><p className="text-[11px] font-extrabold tracking-wide text-slate-800">{nhisNumber || 'Not enrolled / Not recorded'}</p>{nhisNumber && <p className="text-[8px] text-slate-500">Expiry: {safeDate(nhisExpiry)}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Payment category</p><p className="text-[9px] font-semibold capitalize text-slate-700">{String(patient?.paymentMode || 'Cash').replace(/_/g, ' ')}</p></div>
                <div><p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Registered</p><p className="text-[9px] font-semibold text-slate-700">{registered}</p></div>
              </div>
              <div><p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Address / Residence</p><p className="line-clamp-2 text-[9px] font-medium text-slate-700">{address}</p></div>
              <div className="border-t border-dashed border-slate-300 pt-2">
                <p className="mb-1 text-[7px] font-bold uppercase tracking-widest text-slate-400">Hospital contact</p>
                <div className="flex items-center gap-1.5 text-[8px] text-slate-600"><Phone className="h-3 w-3 text-teal-700" />{hospitalPhone || 'Contact hospital reception'}</div>
                {hospitalAddress && <div className="mt-1 flex items-start gap-1.5 text-[8px] text-slate-600"><MapPin className="mt-0.5 h-3 w-3 shrink-0 text-teal-700" /><span className="line-clamp-1">{hospitalAddress}</span></div>}
              </div>
            </div>
            <footer className="flex items-center justify-between bg-slate-900 px-4 py-2 text-white">
              <span className="text-[7px] font-semibold tracking-wide">If found, please return to the hospital.</span>
              <span className="text-[7px] font-bold tracking-widest">KEEP THIS CARD SAFE</span>
            </footer>
          </section>
        </div>
        <div className="patient-id-card-screen-actions border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500">
          <CalendarDays className="mr-1 inline h-3.5 w-3.5" /> Patient information is pulled from the saved patient record. Missing details display as blank or “Not recorded”; this card does not replace NHIS identification.
        </div>
      </div>
    </div>
  );
}
