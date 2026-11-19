import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Syringe, CalendarClock, ClipboardList, Search, ArrowRight, ShieldCheck } from 'lucide-react';

const cards = [
  { title: 'Patient Vaccination Records', description: 'Find a patient and open their vaccine history or record a new dose.', icon: Users, href: '/dashboard/patients' },
  { title: 'Immunization Follow-ups', description: 'Review upcoming and overdue vaccine doses.', icon: CalendarClock, href: '/dashboard/appointments' },
  { title: 'Vaccine Catalogue', description: 'Manage vaccine catalogue entries from an authorized patient immunization panel.', icon: ClipboardList, href: '/dashboard/patients' },
];

export default function ImmunizationWorkspace() {
  const [search, setSearch] = useState('');
  return <div className="space-y-6">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Immunization Clinic</h1><p className="text-sm text-[var(--text-secondary)]">Vaccination visits, records and dose follow-up in one workspace.</p></div>
      <Link to="/dashboard/patients" className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--icon-cyan-text)]"><Syringe className="h-4 w-4"/> Start immunization entry <ArrowRight className="h-4 w-4"/></Link>
    </header>
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Find a patient to make an immunization entry</label>
      <div className="flex gap-2"><div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3"><Search className="h-4 w-4 text-[var(--text-secondary)]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Patient name or folder number" className="w-full bg-transparent py-2 text-sm text-[var(--text-primary)] outline-none"/></div><Link to={search.trim() ? `/dashboard/patients?search=${encodeURIComponent(search.trim())}` : '/dashboard/patients'} className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">Search patients</Link></div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">Select the patient, open their Vaccines tab, then start or select an immunization attendance to record a dose.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">{cards.map(c=><Link key={c.title} to={c.href} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--icon-cyan-text)]"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]"><c.icon className="h-5 w-5"/></div><h2 className="font-semibold text-[var(--text-primary)]">{c.title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{c.description}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--icon-cyan-text)]">Open <ArrowRight className="h-4 w-4"/></span></Link>)}</div>
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex gap-2"><ShieldCheck className="h-5 w-5 text-[var(--icon-green-text)]"/><h2 className="font-semibold text-[var(--text-primary)]">Clinic workflow</h2></div><ol className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2"><li>1. Select/register patient and open an immunization attendance.</li><li>2. Assess prior doses, eligibility and contraindications.</li><li>3. Select vaccine and plan dose; issue vaccine from stock when stock integration is enabled.</li><li>4. Record administration details and follow-up date.</li></ol><p className="mt-3 text-xs text-[var(--text-secondary)]">Stock issue/dispensing and a consolidated clinic queue are the next integration steps; this workspace does not falsely mark stock as issued or administered.</p></div>
  </div>;
}
