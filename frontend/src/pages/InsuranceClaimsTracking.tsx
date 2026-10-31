import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Banknote, Clock3, FileCheck2, Loader2,
  Plus, RefreshCw, Send, X,
} from 'lucide-react';
import { getInsuranceClaimsTracking, recordInsuranceClaimTrackingEvent } from '../api';
import InsuranceTabs, { INSURANCE_FAMILIES, type InsuranceFamily } from '../components/InsuranceTabs';
import { Badge, Button, cn, Field, FilterSelect, INPUT, TD_MONO, PageHeader, TABLE_SHELL, TH, TH_ROW, TD, TR, SearchInput } from '../components/ui';
import { useToast } from '../store/toastStore';

type TrackingEvent = {
  id: string; eventType: 'submission' | 'adjudication' | 'payment';
  status?: string | null; submissionDate?: string | null; payerReference?: string | null;
  amount?: number | string | null; paymentReference?: string | null; paymentMethod?: string | null;
  notes?: string | null; createdAt: string;
};
type ClaimRow = {
  id: string; claimNumber: string; totalClaimAmount: number | string; finalizedAt?: string | null;
  // This screen reads the raw API envelope, whose relation keys arrive camelCase; the insurance
  // store re-cases its claims to Prisma's names, so the two must not be conflated here.
  insuranceProvider?: { name?: string; type?: string };
  patient?: { folderNumber?: string; surname?: string; otherNames?: string };
  attendance?: { attendanceNumber?: string; dateTime?: string };
  trackingEvents: TrackingEvent[];
  tracking: { totalPaid: number; outstanding: number; latestStatus: string };
};
const money = (value: unknown) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(Number(value || 0));
const titleCase = (value?: string | null) => (value || 'Not submitted').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Same contract the API module declares, kept in sync by deriving it from the call itself. */
type TrackingEventInput = Parameters<typeof recordInsuranceClaimTrackingEvent>[1];

/** The API's `insuranceType` filter for each payer family tab. */
const FAMILY_PARAM: Record<InsuranceFamily, string> = {
  nhis: 'nhis',
  private: 'private',
  corporate: 'corporate',
};

export default function InsuranceClaimsTracking({ family }: { family: InsuranceFamily }) {
  const { success, error: toastError } = useToast();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // The payer family is the tab bar's job now, so this screen no longer offers a
  // fourth "all types" view that would mix three payers in one ledger.
  const type = FAMILY_PARAM[family];
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
        limit: 100, search: search.trim() || undefined, insuranceType: type,
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
      const body: TrackingEventInput = { eventType, notes: notes.trim() || undefined };
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

  const familyMeta = INSURANCE_FAMILIES.find((f) => f.key === family) ?? INSURANCE_FAMILIES[0];

  return (
    <div className="p-4 md:p-6 space-y-5 text-[var(--text-primary)]">
      <PageHeader
        title={`${familyMeta.label} · Claims tracking`}
        subtitle="Payer submissions, adjudication decisions, remittances and outstanding claim balances."
        icon={familyMeta.icon}
        accent={familyMeta.accent}
        actions={<Button icon={RefreshCw} loading={loading} onClick={() => void load()}>Refresh</Button>}
        tabs={<InsuranceTabs family={family} section="tracking" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total claimed" value={money(totals.claimed)} icon={<FileCheck2 size={20} />} />
        <SummaryCard label="Payments received" value={money(totals.paid)} icon={<Banknote size={20} />} />
        <SummaryCard label="Still outstanding" value={money(totals.outstanding)} icon={<Clock3 size={20} />} />
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search claim, patient folder or insurer…" />

      <div className={TABLE_SHELL}>
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-secondary)]"><Loader2 className="animate-spin" size={20} /> Loading claims…</div> :
        claims.length === 0 ? <div className="py-16 text-center"><AlertCircle size={28} className="mx-auto text-[var(--text-tertiary)] mb-2" /><p className="font-medium text-[var(--text-primary)]">No finalized claims found</p><p className="text-sm text-[var(--text-secondary)] mt-1">Finalize a claim first; it will appear here for submission and payment tracking.</p></div> :
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead className={TH_ROW}><tr>
            <th className={TH}>Claim</th><th className={TH}>Patient</th><th className={TH}>Folder #</th><th className={TH}>Attendance #</th><th className={TH}>Payer</th><th className={TH}>Claim amount</th><th className={TH}>Paid</th><th className={TH}>Outstanding</th><th className={TH}>Tracking status</th><th className={TH}>Activity</th>
          </tr></thead>
          <tbody>{claims.map(claim => <tr key={claim.id} className={TR}>
            <td className={TD}><div className="font-semibold text-[var(--text-primary)]">{claim.claimNumber}</div></td>
            <td className={TD}><div className="text-[var(--text-secondary)]">{[claim.patient?.surname, claim.patient?.otherNames].filter(Boolean).join(' ') || 'Unknown patient'}</div></td>
            <td className={TD_MONO}>{claim.patient?.folderNumber || '—'}</td>
            <td className={TD_MONO}>{claim.attendance?.attendanceNumber || '—'}</td>
            <td className={TD}><div className="font-medium">{claim.insuranceProvider?.name || 'Unknown payer'}</div><div className="text-xs text-[var(--text-secondary)]">{titleCase(claim.insuranceProvider?.type)}</div></td>
            <td className={TD}>{money(claim.totalClaimAmount)}</td>
            <td className={cn(TD, 'text-[var(--icon-green-text)]')}>{money(claim.tracking?.totalPaid)}</td>
            <td className={cn(TD, 'font-medium')}>{money(claim.tracking?.outstanding)}</td>
            <td className={TD}><Badge dot size="sm" tone={claim.tracking?.latestStatus === 'paid' ? 'green' : claim.tracking?.latestStatus === 'rejected' ? 'red' : 'orange'}>{titleCase(claim.tracking?.latestStatus)}</Badge></td>
            <td className={TD}><Button size="sm" variant="primary" icon={Plus} onClick={() => openRecord(claim)}>Record activity</Button><div className="mt-1 text-xs text-[var(--text-secondary)]">{claim.trackingEvents?.length || 0} events</div></td>
          </tr>)}</tbody>
        </table></div>}
      </div>
      <p className="text-xs text-[var(--text-secondary)]">Payments recorded here are insurer remittances against claims. They do not alter patient cash payments or the original bill ledger.</p>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setSelected(null); }}>
        <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
          <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4"><div><h2 className="text-lg font-bold">Record claim activity</h2><p className="text-sm text-[var(--text-secondary)]">{selected.claimNumber} · {selected.insuranceProvider?.name}</p></div><Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={() => setSelected(null)} disabled={saving} /></div>
          <div className="p-5">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-[var(--bg-main)] p-3 text-sm"><div><div className="text-xs text-[var(--text-secondary)]">Claimed</div><strong>{money(selected.totalClaimAmount)}</strong></div><div><div className="text-xs text-[var(--text-secondary)]">Paid</div><strong className="text-[var(--icon-green-text)]">{money(selected.tracking?.totalPaid)}</strong></div><div><div className="text-xs text-[var(--text-secondary)]">Outstanding</div><strong>{money(selected.tracking?.outstanding)}</strong></div></div>
            <form onSubmit={submitEvent} className="space-y-4">
              <Field label="Activity type">
                <FilterSelect
                  className="w-full"
                  value={eventType}
                  onChange={(v) => setEventType(v as TrackingEventInput['eventType'])}
                  options={[
                    { value: 'submission', label: 'Record submission' },
                    { value: 'adjudication', label: 'Update payer decision' },
                    { value: 'payment', label: 'Record payment' },
                  ]}
                />
              </Field>
              {eventType === 'submission' && <><Field label="Payer / submission reference" required><input value={payerReference} onChange={e => setPayerReference(e.target.value)} placeholder="Batch or portal reference" className={cn(INPUT, 'w-full')} /></Field><Field label="Submission date"><input type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} className={cn(INPUT, 'w-full')} /></Field></>}
              {eventType === 'adjudication' && <><Field label="Payer decision"><FilterSelect className="w-full" value={status} onChange={setStatus} options={[{ value: 'acknowledged', label: 'Acknowledged' }, { value: 'under_review', label: 'Under review' }, { value: 'queried', label: 'Queried / needs correction' }, { value: 'approved', label: 'Approved' }, { value: 'partially_approved', label: 'Partially approved' }, { value: 'rejected', label: 'Rejected' }]} /></Field><Field label="Payer reference (optional)"><input value={payerReference} onChange={e => setPayerReference(e.target.value)} placeholder="Remittance or query reference" className={cn(INPUT, 'w-full')} /></Field></>}
              {eventType === 'payment' && <><Field label="Amount received (GHS)" required><input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={cn(INPUT, 'w-full')} /></Field><Field label="Unique payment / remittance reference" required hint="A duplicate reference is rejected by the payer ledger."><input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Bank advice or remittance number" className={cn(INPUT, 'w-full')} /></Field><Field label="Payment method"><FilterSelect className="w-full" value={paymentMethod} onChange={setPaymentMethod} options={[{ value: 'bank_transfer', label: 'Bank transfer' }, { value: 'cheque', label: 'Cheque' }, { value: 'mobile_money', label: 'Mobile money' }, { value: 'other', label: 'Other' }]} /></Field><Field label="Payer remittance reference (optional)"><input value={payerReference} onChange={e => setPayerReference(e.target.value)} placeholder="Advice number" className={cn(INPUT, 'w-full')} /></Field></>}
              <Field label="Notes (optional)"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Queries, deductions, follow-up details or receipt notes" className={cn(INPUT, 'w-full')} /></Field>
              {selected.trackingEvents?.length > 0 && <div><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Previous activity</h3><div className="max-h-40 space-y-2 overflow-y-auto">{selected.trackingEvents.slice().reverse().map(ev => <div key={ev.id} className="rounded-lg border border-[var(--border-color)] p-3 text-xs"><div className="flex justify-between gap-2"><strong>{titleCase(ev.eventType)}{ev.status ? ` · ${titleCase(ev.status)}` : ''}</strong><span className="text-[var(--text-secondary)]">{new Date(ev.createdAt).toLocaleDateString()}</span></div>{ev.amount != null && <div className="mt-1">{money(ev.amount)} · {ev.paymentReference}</div>}{ev.payerReference && <div className="mt-1 text-[var(--text-secondary)]">Reference: {ev.payerReference}</div>}{ev.notes && <p className="mt-1 text-[var(--text-secondary)]">{ev.notes}</p>}</div>)}</div></div>}
              <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4"><Button onClick={() => setSelected(null)} disabled={saving}>Cancel</Button><Button type="submit" variant="primary" icon={Send} loading={saving}>Save activity</Button></div>
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
