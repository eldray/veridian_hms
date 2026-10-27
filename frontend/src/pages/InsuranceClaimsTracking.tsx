import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Banknote, Clock3, FileCheck2, Loader2,
  Plus, RefreshCw, Search, Send, ShieldCheck, X,
} from 'lucide-react';
import { getInsuranceClaimsTracking, recordInsuranceClaimTrackingEvent } from '../api';
import InsuranceSectionTabs from '../components/InsuranceSectionTabs';
import { useToast } from '../store/toastStore';

type TrackingEvent = {
  id: string; eventType: 'submission' | 'adjudication' | 'payment';
  status?: string | null; submissionDate?: string | null; payerReference?: string | null;
  amount?: number | string | null; paymentReference?: string | null; paymentMethod?: string | null;
  notes?: string | null; createdAt: string;
};
type ClaimRow = {
  id: string; claimNumber: string; totalClaimAmount: number | string; finalizedAt?: string | null;
  InsuranceProvider?: { name?: string; type?: string };
  Patient?: { folderNumber?: string; surname?: string; otherNames?: string };
  Attendance?: { attendanceNumber?: string; dateTime?: string };
  trackingEvents: TrackingEvent[];
  tracking: { totalPaid: number; outstanding: number; latestStatus: string };
};
const money = (value: unknown) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(Number(value || 0));
const titleCase = (value?: string | null) => (value || 'Not submitted').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function InsuranceClaimsTracking() {
  const { success, error: toastError } = useToast();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState<ClaimRow | null>(null);
  const [eventType, setEventType] = useState<'submission' | 'adjudication' | 'payment'>('submission');
  const [status, setStatus] = useState('submitted');
  const [payerReference, setPayerReference] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getInsuranceClaimsTracking({
        params: { limit: 100, search: search.trim() || undefined, insuranceType: type === 'all' ? undefined : type },
      });
      const payload = response?.data?.data ?? response?.data;
      setClaims(Array.isArray(payload) ? payload : payload?.data || []);
    } catch (err: any) {
      toastError('Could not load claims tracking', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally { setLoading(false); }
  }, [search, type, toastError]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => claims.reduce((acc, claim) => {
    acc.claimed += Number(claim.totalClaimAmount || 0);
    acc.paid += Number(claim.tracking?.totalPaid || 0);
    acc.outstanding += Number(claim.tracking?.outstanding ?? claim.totalClaimAmount ?? 0);
    return acc;
  }, { claimed: 0, paid: 0, outstanding: 0 }), [claims]);

  const openRecord = (claim: ClaimRow) => {
    setSelected(claim);
    setEventType('submission');
    setStatus('submitted');
    setPayerReference('');
    setPaymentReference('');
    setAmount('');
    setPaymentMethod('bank_transfer');
    setSubmissionDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  };

  const submitEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (eventType === 'payment' && (!paymentReference.trim() || !(Number(amount) > 0))) {
      toastError('Payment details required', 'Enter a unique remittance reference and a payment amount greater than zero.');
      return;
    }
    if (eventType === 'submission' && !payerReference.trim()) {
      toastError('Submission reference required', 'Enter the payer or submission batch reference.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { eventType, notes: notes.trim() || undefined };
      if (eventType === 'submission') Object.assign(body, { payerReference: payerReference.trim(), submissionDate });
      if (eventType === 'adjudication') Object.assign(body, { status, payerReference: payerReference.trim() || undefined });
      if (eventType === 'payment') Object.assign(body, { amount: Number(amount), paymentReference: paymentReference.trim(), paymentMethod, payerReference: payerReference.trim() || undefined });
      await recordInsuranceClaimTrackingEvent(selected.id, body);
      success('Claim tracking updated', eventType === 'payment' ? 'Remittance recorded.' : 'Tracking event recorded.');
      setSelected(null);
      await load();
    } catch (err: any) {
      toastError('Could not record tracking event', err?.response?.data?.message || err?.message || 'Please review the details and retry.');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 text-[var(--text-primary)]">
      <InsuranceSectionTabs active="tracking" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Insurance Claims Tracking</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Track payer submissions, adjudication decisions, remittances and outstanding claim balances.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-main)]" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total claimed" value={money(totals.claimed)} icon={<FileCheck2 size={20} />} />
        <SummaryCard label="Payments received" value={money(totals.paid)} icon={<Banknote size={20} />} />
        <SummaryCard label="Still outstanding" value={money(totals.outstanding)} icon={<Clock3 size={20} />} />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search claim, patient folder or insurer…" className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]" />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} className="rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-sm bg-[var(--bg-card)]">
          <option value="all">All payer types</option><option value="nhis">NHIS</option><option value="private">Private insurance</option><option value="corporate">Corporate</option>
        </select>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-secondary)]"><Loader2 className="animate-spin" size={20} /> Loading claims…</div> :
        claims.length === 0 ? <div className="py-16 text-center"><AlertCircle size={28} className="mx-auto text-[var(--text-tertiary)] mb-2" /><p className="font-medium text-[var(--text-primary)]">No finalized claims found</p><p className="text-sm text-[var(--text-secondary)] mt-1">Finalize a claim first; it will appear here for submission and payment tracking.</p></div> :
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead className="bg-[var(--bg-main)] text-xs uppercase text-[var(--text-secondary)]"><tr>
            <th className="px-4 py-3">Claim / Patient</th><th className="px-4 py-3">Payer</th><th className="px-4 py-3">Claim amount</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Outstanding</th><th className="px-4 py-3">Tracking status</th><th className="px-4 py-3">Activity</th>
          </tr></thead>
          <tbody className="divide-y divide-[var(--border-color)]">{claims.map(claim => <tr key={claim.id} className="hover:bg-[var(--bg-main)]">
            <td className="px-4 py-3"><div className="font-semibold text-[var(--text-primary)]">{claim.claimNumber}</div><div className="text-[var(--text-secondary)]">{[claim.Patient?.surname, claim.Patient?.otherNames].filter(Boolean).join(' ') || 'Unknown patient'}</div><div className="text-xs text-[var(--text-tertiary)]">{claim.Patient?.folderNumber || claim.Attendance?.attendanceNumber || ''}</div></td>
            <td className="px-4 py-3"><div className="font-medium">{claim.InsuranceProvider?.name || 'Unknown payer'}</div><div className="text-xs text-[var(--text-secondary)]">{titleCase(claim.InsuranceProvider?.type)}</div></td>
            <td className="px-4 py-3 whitespace-nowrap">{money(claim.totalClaimAmount)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-[var(--icon-green-text)]">{money(claim.tracking?.totalPaid)}</td>
            <td className="px-4 py-3 whitespace-nowrap font-medium">{money(claim.tracking?.outstanding)}</td>
            <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${claim.tracking?.latestStatus === 'paid' ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : claim.tracking?.latestStatus === 'rejected' ? 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' : 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]'}`}>{titleCase(claim.tracking?.latestStatus)}</span></td>
            <td className="px-4 py-3"><button onClick={() => openRecord(claim)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--icon-cyan-text)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"><Plus size={14} /> Record activity</button><div className="mt-1 text-xs text-[var(--text-secondary)]">{claim.trackingEvents?.length || 0} events</div></td>
          </tr>)}</tbody>
        </table></div>}
      </div>
      <p className="text-xs text-[var(--text-secondary)]">Payments recorded here are insurer remittances against claims. They do not alter patient cash payments or the original bill ledger.</p>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setSelected(null); }}>
        <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
          <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4"><div><h2 className="text-lg font-bold">Record claim activity</h2><p className="text-sm text-[var(--text-secondary)]">{selected.claimNumber} · {selected.InsuranceProvider?.name}</p></div><button onClick={() => setSelected(null)} disabled={saving} className="rounded-lg p-1.5 hover:bg-[var(--bg-main)]"><X size={20} /></button></div>
          <div className="p-5">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-[var(--bg-main)] p-3 text-sm"><div><div className="text-xs text-[var(--text-secondary)]">Claimed</div><strong>{money(selected.totalClaimAmount)}</strong></div><div><div className="text-xs text-[var(--text-secondary)]">Paid</div><strong className="text-[var(--icon-green-text)]">{money(selected.tracking?.totalPaid)}</strong></div><div><div className="text-xs text-[var(--text-secondary)]">Outstanding</div><strong>{money(selected.tracking?.outstanding)}</strong></div></div>
            <form onSubmit={submitEvent} className="space-y-4">
              <label className="block text-sm font-medium text-[var(--text-primary)]">Activity type<select value={eventType} onChange={e => setEventType(e.target.value as any)} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5"><option value="submission">Record submission</option><option value="adjudication">Update payer decision</option><option value="payment">Record payment</option></select></label>
              {eventType === 'submission' && <><Field label="Payer / submission reference *" value={payerReference} onChange={setPayerReference} placeholder="Batch or portal reference" /><Field label="Submission date" value={submissionDate} onChange={setSubmissionDate} type="date" /></>}
              {eventType === 'adjudication' && <><label className="block text-sm font-medium text-[var(--text-primary)]">Payer decision<select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5"><option value="acknowledged">Acknowledged</option><option value="under_review">Under review</option><option value="queried">Queried / needs correction</option><option value="approved">Approved</option><option value="partially_approved">Partially approved</option><option value="rejected">Rejected</option></select></label><Field label="Payer reference (optional)" value={payerReference} onChange={setPayerReference} placeholder="Remittance or query reference" /></>}
              {eventType === 'payment' && <><Field label="Amount received (GHS) *" value={amount} onChange={setAmount} type="number" placeholder="0.00" /><Field label="Unique payment / remittance reference *" value={paymentReference} onChange={setPaymentReference} placeholder="Bank advice or remittance number" /><label className="block text-sm font-medium text-[var(--text-primary)]">Payment method<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5"><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="mobile_money">Mobile money</option><option value="other">Other</option></select></label><Field label="Payer remittance reference (optional)" value={payerReference} onChange={setPayerReference} placeholder="Advice number" /></>}
              <label className="block text-sm font-medium text-[var(--text-primary)]">Notes (optional)<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5" placeholder="Queries, deductions, follow-up details or receipt notes" /></label>
              {selected.trackingEvents?.length > 0 && <div><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Previous activity</h3><div className="max-h-40 space-y-2 overflow-y-auto">{selected.trackingEvents.slice().reverse().map(ev => <div key={ev.id} className="rounded-lg border border-[var(--border-color)] p-3 text-xs"><div className="flex justify-between gap-2"><strong>{titleCase(ev.eventType)}{ev.status ? ` · ${titleCase(ev.status)}` : ''}</strong><span className="text-[var(--text-secondary)]">{new Date(ev.createdAt).toLocaleDateString()}</span></div>{ev.amount != null && <div className="mt-1">{money(ev.amount)} · {ev.paymentReference}</div>}{ev.payerReference && <div className="mt-1 text-[var(--text-secondary)]">Reference: {ev.payerReference}</div>}{ev.notes && <p className="mt-1 text-[var(--text-secondary)]">{ev.notes}</p>}</div>)}</div></div>}
              <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4"><button type="button" onClick={() => setSelected(null)} disabled={saving} className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm hover:bg-[var(--bg-main)]">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-text)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Save activity</button></div>
            </form>
          </div>
        </div>
      </div>}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center justify-between text-[var(--text-secondary)]"><span className="text-sm">{label}</span>{icon}</div><div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{value}</div></div>;
}
function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-sm font-medium text-[var(--text-primary)]">{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? '0.01' : undefined} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--icon-cyan-text)]" /></label>;
}
