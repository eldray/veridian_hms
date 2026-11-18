import { useSmartBack } from '../utils/useSmartBack';
// src/pages/EstimateDetails.tsx - Proforma invoice (estimate) detail + actions
// DESIGN: the screen IS the print template. One full A4-style page, not a
// compact card: tall page, wide margins, large type, generous row height.
// What you see on screen is exactly what prints — same letterhead, same
// bill-to, same table, same totals, same footer. Actions stay in the toolbar
// above the page, never inside it.
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
  Pencil, Trash2, MapPin, Phone, Mail, Building2, X,
} from 'lucide-react';
import {
  Badge, Button, humanStatus, PageHeader, statusTone,
} from '../components/ui';

const estimateBadgeTone = (status: EstimateStatus) =>
  status === 'SENT' ? 'cyan'
    : status === 'CONVERTED' ? 'purple'
      : statusTone(status);

// ── THE PRINT TEMPLATE. Screen renders this same structure below, so the
//    two can never drift apart again. Edit here and the screen follows. ──
const printHtml = (est: any, hospital: any, fmt: (n: any) => string) => {
  const rows = (est.items || []).map((it: any) => `
    <tr>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb">${it.serviceCatalog?.code || '—'}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-weight:500">${it.description}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${it.quantity}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right">GHS ${fmt(it.unitPrice)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right">GHS ${fmt(it.vatAmount)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">GHS ${fmt(it.totalPrice)}</td>
    </tr>`).join('');
  return `
  <div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;color:#111;background:#fff;padding:48px 56px;min-height:1050px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #0e7490">
      <div>
        <h1 style="margin:0;font-size:26px">${hospital?.name || 'Hospital'}</h1>
        <div style="font-size:14px;color:#555;margin-top:6px">${hospital?.address || ''}</div>
        <div style="font-size:13px;color:#555;margin-top:2px">${(hospital as any)?.phone || ''} ${(hospital as any)?.email ? ` · ${(hospital as any).email}` : ''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:700;letter-spacing:3px;color:#0e7490">PROFORMA INVOICE</div>
        <div style="font-size:16px;font-weight:600;margin-top:8px">${est.referenceNumber}</div>
        <div style="font-size:13px;color:#555;margin-top:4px">Status: ${est.status}</div>
      </div>
    </div>
    <table style="width:100%;font-size:14px;margin:28px 0">
      <tr>
        <td style="padding:6px 0"><span style="font-size:11px;letter-spacing:2px;color:#888">BILL TO</span><br/><b style="font-size:16px">${est.patient ? getPatientName(est.patient) : 'Walk-in client'}</b><br/><span style="color:#555">Folder: ${est.patient?.folderNumber || '—'}</span></td>
        <td style="padding:6px 0;text-align:right;vertical-align:top"><span style="font-size:11px;letter-spacing:2px;color:#888">DATE ISSUED</span><br/>${new Date(est.createdAt).toLocaleDateString()}<br/><br/><span style="font-size:11px;letter-spacing:2px;color:#888">VALID UNTIL</span><br/>${est.expiresAt ? new Date(est.expiresAt).toLocaleDateString() : `${est.validityDays} days`}</td>
      </tr>
      ${est.corporateAccount ? `<tr><td style="padding:6px 0;color:#555"><b>Corporate:</b> ${est.corporateAccount.companyName}</td><td></td></tr>` : ''}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f3f4f6"><th style="text-align:left;padding:12px;border-bottom:2px solid #ddd">Code</th><th style="text-align:left;padding:12px;border-bottom:2px solid #ddd">Description</th><th style="padding:12px;border-bottom:2px solid #ddd">Qty</th><th style="padding:12px;border-bottom:2px solid #ddd;text-align:right">Unit (GHS)</th><th style="padding:12px;border-bottom:2px solid #ddd;text-align:right">VAT</th><th style="padding:12px;border-bottom:2px solid #ddd;text-align:right">Total (GHS)</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="padding:24px;text-align:center;color:#999">No line items</td></tr>'}</tbody>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:32px">
      <div style="font-size:13px;max-width:380px">
        ${est.notes ? `<p><b>Notes</b><br/>${est.notes}</p>` : ''}
        ${est.termsAndConditions ? `<p style="color:#666"><b>Terms &amp; conditions</b><br/>${est.termsAndConditions}</p>` : ''}
        <p style="color:#999;font-size:12px">This is an estimate only and not a demand for payment. Prices are subject to change.</p>
      </div>
      <table style="font-size:14px;width:300px">
        <tr><td style="padding:6px 0;text-align:right;color:#555">Subtotal</td><td style="padding:6px 0;text-align:right">GHS ${fmt(est.subtotal)}</td></tr>
        <tr><td style="padding:6px 0;text-align:right;color:#555">Discount</td><td style="padding:6px 0;text-align:right">- GHS ${fmt(est.discount)}</td></tr>
        <tr><td style="padding:6px 0;text-align:right;color:#555">Tax (VAT)</td><td style="padding:6px 0;text-align:right">GHS ${fmt(est.taxAmount)}</td></tr>
        <tr><td style="padding:10px 0;text-align:right;font-weight:700;font-size:17px;border-top:2px solid #111">Total (estimate)</td><td style="padding:10px 0;text-align:right;font-weight:700;font-size:17px;border-top:2px solid #111">GHS ${fmt(est.totalAmount)}</td></tr>
      </table>
    </div>
    <div style="display:flex;gap:48px;margin-top:72px;font-size:14px">
      <div style="flex:1;border-top:1px solid #ccc;padding-top:8px"><span style="font-size:11px;color:#888">PREPARED BY</span><br/>${hospital?.name || 'Hospital'}</div>
      <div style="flex:1;border-top:1px solid #ccc;padding-top:8px"><span style="font-size:11px;color:#888">CLIENT SIGNATURE</span></div>
    </div>
  </div>`;
};

export default function EstimateDetails() {
  const goBack = useSmartBack('/dashboard/estimates');
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
    try { await fn(); success(ok); }
    catch (e: any) { toastError('Action failed', e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  const handleReject = async () => {
    const reason = await promptDialog({
      title: 'Reject estimate',
      message: 'Optional, but a reason tells the requester why this estimate was not accepted.',
      label: 'Reason', multiline: true, confirmText: 'Reject estimate', maxLength: 2000,
    });
    if (reason === null) return;
    run(() => rejectEstimate(id!, reason || undefined), 'Estimate rejected');
  };
  const handlePrint = () => { if (est) openPrintWindow(printHtml(est, hospital, fmt), `Estimate ${est.referenceNumber}`); };

  if (isLoading && !est) {
    return (
      <div className="p-4 md:p-6 text-[var(--text-primary)]">
        <PageHeader title="Estimate" icon={FileText} accent="cyan" backTo="/dashboard/estimates" />
        <div className="p-10 flex items-center justify-center text-[var(--text-tertiary)]"><Loader className="w-5 h-5 animate-spin mr-2" /> Loading estimate…</div>
      </div>
    );
  }
  if (!est) {
    return (
      <div className="p-10 text-center">
        <p className="text-[var(--text-secondary)]">Estimate not found.</p>
        <Button variant="primary" className="mt-4" onClick={goBack}>Back to Estimates</Button>
      </div>
    );
  }

  const itemCount = est.items?.length ?? 0;
  const totalQty = (est.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  const expired = est.expiresAt ? new Date(est.expiresAt) < new Date() : false;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Toolbar — page controls, NOT part of the invoice */}
      <div className="p-4 md:p-6 pb-0">
        <PageHeader
          title={<>{est.referenceNumber} <Badge tone={estimateBadgeTone(est.status)} dot size="sm">{humanStatus(est.status)}</Badge></>}
          subtitle={`${est.patient ? getPatientName(est.patient) : 'Walk-in client'} • ${itemCount} items · ${totalQty} qty · GHS ${fmt(est.totalAmount)}`}
          meta={est.corporateAccount ? (<span className="inline-flex items-center gap-1 text-[var(--icon-cyan-text)]"><Briefcase className="w-3 h-3" /> {est.corporateAccount.companyName}</span>) : undefined}
          icon={FileText} accent="cyan" backTo="/dashboard/estimates"
          actions={(
            <>
              <Button variant="secondary" icon={X} onClick={goBack}>Close</Button>
              <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print</Button>
              {est.status === 'DRAFT' && (
                <>
                  <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/dashboard/estimates/${est.id}/edit`)}>Edit</Button>
                  <Button variant="dangerSoft" icon={Trash2} loading={busy}
                    onClick={() => run(async () => {
                      if (!(await confirmDialog({ title: 'Delete draft estimate', message: 'Delete this draft estimate?', confirmText: 'Delete' }))) return;
                      await removeEstimate(est.id); navigate('/dashboard/estimates');
                    }, 'Estimate deleted')}>Delete</Button>
                  <Button variant="primary" icon={Send} loading={busy} onClick={() => run(() => sendEstimate(id!), 'Estimate sent')}>Send</Button>
                </>
              )}
              {est.status === 'SENT' && (
                <>
                  <Button variant="soft" accent="green" icon={CheckCircle} loading={busy} onClick={() => run(() => acceptEstimate(id!), 'Estimate accepted')}>Accept</Button>
                  <Button variant="danger" icon={XCircle} loading={busy} onClick={handleReject}>Reject</Button>
                </>
              )}
              {est.status === 'CONVERTED' && est.bill && (
                <Button variant="primary" icon={Receipt} onClick={() => navigate(`/dashboard/billing/${est.bill!.id}/payment`)}>View Bill {est.bill.billNumber}</Button>
              )}
            </>
          )}
        />
      </div>

      {/* ── THE PAGE — full A4 sheet, same structure as printHtml() above ── */}
      <div className="px-4 md:px-6 py-6 w-full">
        <div className="w-full bg-[var(--bg-card)] rounded-lg shadow-xl px-6 md:px-10 lg:px-14 py-12 min-h-[1050px] flex flex-col">
          {/* Letterhead */}
          <div className="flex justify-between items-start gap-6 pb-6 border-b-[3px] border-[var(--icon-cyan-text)]">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>
                <Building2 className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[26px] leading-tight font-bold">{hospital?.name || 'Hospital'}</h1>
                {hospital?.address && <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{hospital.address}</p>}
                <p className="text-[13px] text-[var(--text-secondary)] flex items-center gap-3 mt-0.5">
                  {(hospital as any)?.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{(hospital as any).phone}</span>}
                  {(hospital as any)?.email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{(hospital as any).email}</span>}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[15px] font-bold tracking-[3px] uppercase" style={{ color: 'var(--icon-cyan-text)' }}>Proforma Invoice</p>
              <p className="text-base font-semibold mt-2">{est.referenceNumber}</p>
              <p className="mt-1.5"><Badge tone={estimateBadgeTone(est.status)} dot size="sm">{humanStatus(est.status)}</Badge></p>
            </div>
          </div>

          {/* Bill-to / dates */}
          <div className="flex justify-between gap-6 my-7 text-sm">
            <div>
              <p className="text-[11px] tracking-[2px] text-[var(--text-tertiary)]">BILL TO</p>
              <p className="text-base font-semibold mt-1.5">{est.patient ? getPatientName(est.patient) : 'Walk-in client'}</p>
              <p className="text-[var(--text-secondary)] mt-0.5">Folder: {est.patient?.folderNumber || '—'}</p>
              {est.corporateAccount && <p className="text-[var(--text-secondary)] mt-1.5"><span className="font-medium text-[var(--text-primary)]">Corporate:</span> {est.corporateAccount.companyName}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] tracking-[2px] text-[var(--text-tertiary)]">DATE ISSUED</p>
              <p className="mt-1.5">{new Date(est.createdAt).toLocaleDateString()}</p>
              <p className="text-[11px] tracking-[2px] text-[var(--text-tertiary)] mt-4">VALID UNTIL</p>
              <p className={expired ? 'mt-1.5 text-[var(--danger)] font-medium' : 'mt-1.5'}>{est.expiresAt ? new Date(est.expiresAt).toLocaleDateString() : `${est.validityDays} days`}{expired ? ' · Expired' : ''}</p>
            </div>
          </div>

          {/* Line items — tall rows, generous padding */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-main)]">
                <th className="text-left font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Code</th>
                <th className="text-left font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Description</th>
                <th className="text-center font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Qty</th>
                <th className="text-right font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Unit (GHS)</th>
                <th className="text-right font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">VAT</th>
                <th className="text-right font-semibold px-3 py-3 border-b-2 border-[var(--border-color)]">Total (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {(est.items || []).map((it) => (
                <tr key={it.id} className="border-b border-[var(--border-color)]">
                  <td className="px-3 py-3.5 font-mono text-[13px]">{it.serviceCatalog?.code || '—'}</td>
                  <td className="px-3 py-3.5 font-medium">{it.description}</td>
                  <td className="px-3 py-3.5 text-center">{it.quantity}</td>
                  <td className="px-3 py-3.5 text-right">GHS {fmt(it.unitPrice)}</td>
                  <td className="px-3 py-3.5 text-right">GHS {fmt(it.vatAmount)}</td>
                  <td className="px-3 py-3.5 text-right font-semibold">GHS {fmt(it.totalPrice)}</td>
                </tr>
              ))}
              {(!est.items || est.items.length === 0) && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No line items</td></tr>
              )}
            </tbody>
          </table>

          {/* Totals + notes — pushed down the page like a real invoice */}
          <div className="flex justify-between gap-8 mt-8 flex-1">
            <div className="text-sm max-w-[560px] flex-1 space-y-4">
              {est.notes && (<div><p className="font-semibold">Notes</p><p className="mt-1 leading-relaxed">{est.notes}</p></div>)}
              {est.termsAndConditions && (<div><p className="font-semibold">Terms &amp; conditions</p><p className="mt-1 leading-relaxed text-[var(--text-secondary)]">{est.termsAndConditions}</p></div>)}
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">This is an estimate only and not a demand for payment. Prices are subject to change.</p>
            </div>
            <table className="text-sm w-[340px] shrink-0 h-fit">
              <tbody>
                <tr><td className="py-1.5 text-right text-[var(--text-secondary)]">Subtotal</td><td className="py-1.5 text-right pl-4">GHS {fmt(est.subtotal)}</td></tr>
                <tr><td className="py-1.5 text-right text-[var(--text-secondary)]">Discount</td><td className="py-1.5 text-right pl-4">- GHS {fmt(est.discount)}</td></tr>
                <tr><td className="py-1.5 text-right text-[var(--text-secondary)]">Tax (VAT)</td><td className="py-1.5 text-right pl-4">GHS {fmt(est.taxAmount)}</td></tr>
                <tr><td className="py-2.5 text-right font-bold text-[17px] border-t-2 border-[var(--text-primary)]">Total (estimate)</td><td className="py-2.5 text-right pl-4 font-bold text-[17px] border-t-2 border-[var(--text-primary)]">GHS {fmt(est.totalAmount)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Signature row — pinned to the bottom of the page */}
          <div className="flex gap-12 mt-16 text-sm">
            <div className="flex-1 border-t border-[var(--border-color)] pt-2"><p className="text-[11px] text-[var(--text-tertiary)]">PREPARED BY</p><p className="font-medium mt-1">{hospital?.name || 'Hospital'}</p></div>
            <div className="flex-1 border-t border-[var(--border-color)] pt-2"><p className="text-[11px] text-[var(--text-tertiary)]">CLIENT SIGNATURE</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
