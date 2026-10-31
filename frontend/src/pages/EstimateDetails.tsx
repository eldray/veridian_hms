// src/pages/EstimateDetails.tsx - Proforma invoice (estimate) detail + actions
import { useEffect, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { promptDialog } from '../context/PromptDialog';
import { useNavigate, useParams } from 'react-router-dom';
import { useEstimatesStore, type EstimateStatus } from '../store/estimatesStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { getPatientName } from '../utils/patient';
import { openPrintWindow } from '../utils/pdfGenerator';
import {
  Send, CheckCircle, XCircle, FileText, Printer, Receipt, Loader, Briefcase,
  Pencil, Trash2,
} from 'lucide-react';
import {
  Badge, Button, cn, humanStatus, PageHeader, statusTone, TABLE_SHELL, TD, TH, TH_ROW, TR,
} from '../components/ui';

// SENT and CONVERTED are not in Badge's STATUS_TONES, so the colours this page
// committed to for those two are kept locally; everything else uses statusTone().
const estimateBadgeTone = (status: EstimateStatus) =>
  status === 'SENT' ? 'cyan'
    : status === 'CONVERTED' ? 'purple'
      : statusTone(status);

export default function EstimateDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();
  const {
    currentEstimate: est, isLoading, loadEstimate,
    sendEstimate, acceptEstimate, rejectEstimate, removeEstimate,
  } = useEstimatesStore();

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) loadEstimate(id).catch((e: any) => toastError('Load failed', e?.response?.data?.message || e.message));
  }, [id]);

  const fmt = (n: any) => Number(n || 0).toFixed(2);

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      success(ok);
    } catch (e: any) {
      toastError('Action failed', e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = await promptDialog({
      title: 'Reject estimate',
      message: 'Optional, but a reason tells the requester why this estimate was not accepted.',
      label: 'Reason',
      multiline: true,
      confirmText: 'Reject estimate',
      maxLength: 2000,
    });
    if (reason === null) return;
    run(() => rejectEstimate(id!, reason || undefined), 'Estimate rejected');
  };

  const handlePrint = () => {
    if (!est) return;
    const rows = (est.items || []).map((it) => `
      <tr>
        <td>${it.description}${it.serviceCatalog?.code ? ` (${it.serviceCatalog.code})` : ''}</td>
        <td style="text-align:center">${it.quantity}</td>
        <td style="text-align:right">${fmt(it.unitPrice)}</td>
        <td style="text-align:right">${fmt(it.totalPrice)}</td>
      </tr>`).join('');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#111">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:16px">
          <h2 style="margin:0">${hospital?.name || 'Hospital'}</h2>
          <div style="font-size:12px;color:#555">${hospital?.address || ''}</div>
          <h3 style="margin:10px 0 0">PROFORMA INVOICE / ESTIMATE</h3>
        </div>
        <table style="width:100%;font-size:13px;margin-bottom:12px">
          <tr><td><b>Reference:</b> ${est.referenceNumber}</td><td style="text-align:right"><b>Date:</b> ${new Date(est.createdAt).toLocaleDateString()}</td></tr>
          <tr><td><b>Patient:</b> ${est.patient ? getPatientName(est.patient) : 'Walk-in client'}</td><td style="text-align:right"><b>Folder:</b> ${est.patient?.folderNumber || '—'}</td></tr>
          ${est.corporateAccount ? `<tr><td colspan="2"><b>Corporate:</b> ${est.corporateAccount.companyName}</td></tr>` : ''}
          <tr><td><b>Status:</b> ${est.status}</td><td style="text-align:right"><b>Valid until:</b> ${est.expiresAt ? new Date(est.expiresAt).toLocaleDateString() : `${est.validityDays} days`}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f3f4f6">
            <th style="text-align:left;padding:6px;border:1px solid #ddd">Description</th>
            <th style="padding:6px;border:1px solid #ddd">Qty</th>
            <th style="padding:6px;border:1px solid #ddd">Unit (GHS)</th>
            <th style="padding:6px;border:1px solid #ddd">Total (GHS)</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <table style="width:100%;font-size:13px;margin-top:12px">
          <tr><td style="text-align:right">Subtotal:</td><td style="text-align:right;width:120px">GHS ${fmt(est.subtotal)}</td></tr>
          <tr><td style="text-align:right">Discount:</td><td style="text-align:right">GHS ${fmt(est.discount)}</td></tr>
          <tr><td style="text-align:right">Tax:</td><td style="text-align:right">GHS ${fmt(est.taxAmount)}</td></tr>
          <tr><td style="text-align:right;font-weight:bold">Total:</td><td style="text-align:right;font-weight:bold">GHS ${fmt(est.totalAmount)}</td></tr>
        </table>
        ${est.termsAndConditions ? `<p style="font-size:11px;color:#666;margin-top:16px"><b>Terms:</b> ${est.termsAndConditions}</p>` : ''}
        <p style="font-size:11px;color:#999;margin-top:8px">This is an estimate only and not a demand for payment. Prices are subject to change.</p>
      </div>`;
    openPrintWindow(html, `Estimate ${est.referenceNumber}`);
  };

  if (isLoading && !est) {
    return (
      <div className="p-6 text-[var(--text-primary)]">
        <PageHeader title="Estimate" icon={FileText} accent="cyan" backTo="/dashboard/estimates" />
        <div className="p-10 flex items-center justify-center text-[var(--text-tertiary)]"><Loader className="w-5 h-5 animate-spin mr-2" /> Loading estimate…</div>
      </div>
    );
  }
  if (!est) {
    return (
      <div className="p-10 text-center">
        <p className="text-[var(--text-secondary)]">Estimate not found.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/dashboard/estimates')}>Back to Estimates</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 text-[var(--text-primary)]">
      {/* Header */}
      <PageHeader
        title={(
          <>
            {est.referenceNumber}{' '}
            <Badge tone={estimateBadgeTone(est.status)} dot size="sm">{humanStatus(est.status)}</Badge>
          </>
        )}
        subtitle={`${est.patient ? getPatientName(est.patient) : 'Walk-in client'} • ${est.patient?.folderNumber || '—'}`}
        meta={est.corporateAccount ? (
          <span className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)]"><Briefcase className="w-3 h-3" /> {est.corporateAccount.companyName}</span>
        ) : undefined}
        icon={FileText}
        accent="cyan"
        backTo="/dashboard/estimates"
        actions={(
          <>
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print</Button>
            {est.status === 'DRAFT' && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/dashboard/estimates/${est.id}/edit`)}>Edit</Button>
                <Button
                  variant="dangerSoft"
                  icon={Trash2}
                  loading={busy}
                  onClick={() => run(async () => {
                    if (!(await confirmDialog({ title: 'Delete draft estimate', message: 'Delete this draft estimate?', confirmText: 'Delete' }))) return;
                    await removeEstimate(est.id);
                    navigate('/dashboard/estimates');
                  }, 'Estimate deleted')}
                >
                  Delete
                </Button>
                <Button variant="primary" icon={Send} loading={busy} onClick={() => run(() => sendEstimate(id!), 'Estimate sent')}>Send</Button>
              </>
            )}
            {est.status === 'SENT' && (
              <>
                <Button variant="soft" accent="green" icon={CheckCircle} loading={busy} onClick={() => run(() => acceptEstimate(id!), 'Estimate accepted')}>Accept</Button>
                <Button variant="danger" icon={XCircle} loading={busy} onClick={handleReject}>Reject</Button>
              </>
            )}
            {/* No "convert to bill" action: a bill has to carry what was actually
                rendered (labs resulted, drugs dispensed), which a quote never saw.
                Estimates that were converted before still link to their bill. */}
            {est.status === 'CONVERTED' && est.bill && (
              <Button variant="primary" icon={Receipt} onClick={() => navigate(`/dashboard/billing/${est.bill!.id}/payment`)}>View Bill {est.bill.billNumber}</Button>
            )}
          </>
        )}
      />

      {/* Items */}
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={TH_ROW}>
              <tr>
                <th className={TH}>Description</th>
                <th className={cn(TH, 'text-center')}>Qty</th>
                <th className={cn(TH, 'text-right')}>Unit (GHS)</th>
                <th className={cn(TH, 'text-right')}>VAT</th>
                <th className={cn(TH, 'text-right')}>Total (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {(est.items || []).map((it) => (
                <tr key={it.id} className={TR}>
                  <td className={cn(TD, 'whitespace-normal')}>{it.description}{it.serviceCatalog?.code ? <span className="text-[var(--text-tertiary)] text-xs"> ({it.serviceCatalog.code})</span> : null}</td>
                  <td className={cn(TD, 'text-center')}>{it.quantity}</td>
                  <td className={cn(TD, 'text-right')}>{fmt(it.unitPrice)}</td>
                  <td className={cn(TD, 'text-right')}>{fmt(it.vatAmount)}</td>
                  <td className={cn(TD, 'text-right font-medium')}>{fmt(it.totalPrice)}</td>
                </tr>
              ))}
              {(!est.items || est.items.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-tertiary)]">No line items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full sm:w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Subtotal</span><span className="text-[var(--text-primary)]">GHS {fmt(est.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Discount</span><span className="text-[var(--text-primary)]">- GHS {fmt(est.discount)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Tax</span><span className="text-[var(--text-primary)]">GHS {fmt(est.taxAmount)}</span></div>
          <div className="flex justify-between border-t border-[var(--border-color)] pt-2 font-bold text-[var(--text-primary)]"><span>Total</span><span>GHS {fmt(est.totalAmount)}</span></div>
          {est.expiresAt && <p className="text-xs text-[var(--text-tertiary)] pt-1">Valid until {new Date(est.expiresAt).toLocaleDateString()}</p>}
        </div>
      </div>

      {est.notes && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-sm text-[var(--text-primary)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Notes</p>{est.notes}
        </div>
      )}
    </div>
  );
}
