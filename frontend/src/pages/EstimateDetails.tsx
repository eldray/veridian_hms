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
  ArrowLeft, Send, CheckCircle, XCircle, FileText, Printer, Receipt, Loader, Briefcase,
  Pencil, Trash2,
} from 'lucide-react';

const STATUS_STYLES: Record<EstimateStatus, string> = {
  DRAFT: 'bg-[var(--bg-main)] text-[var(--text-secondary)]',
  SENT: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]',
  APPROVED: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]',
  REJECTED: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]',
  CONVERTED: 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]',
  EXPIRED: 'bg-[var(--icon-orange-bg)] text-[var(--icon-orange-text)]',
};

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'nhis', label: 'NHIS' },
  { value: 'private_insurance', label: 'Private Insurance' },
  { value: 'corporate', label: 'Corporate' },
];

export default function EstimateDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { hospital } = useHospitalStore();
  const {
    currentEstimate: est, isLoading, loadEstimate,
    sendEstimate, acceptEstimate, rejectEstimate, convertToBill, removeEstimate,
  } = useEstimatesStore();

  const [busy, setBusy] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');

  useEffect(() => {
    if (id) loadEstimate(id).catch((e: any) => toastError('Load failed', e?.response?.data?.message || e.message));
  }, [id]);

  useEffect(() => {
    if (est?.corporateAccountId) setPaymentMode('corporate');
  }, [est?.corporateAccountId]);

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

  const handleConvert = async () => {
    setShowConvert(false);
    await run(async () => {
      const result = await convertToBill(id!, { paymentMode });
      if (result?.bill?.id) navigate(`/dashboard/billing/${result.bill.id}/payment`);
    }, 'Estimate converted to bill');
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
          <tr><td><b>Patient:</b> ${getPatientName(est.patient)}</td><td style="text-align:right"><b>Folder:</b> ${est.patient?.folderNumber || '—'}</td></tr>
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
    return <div className="p-10 flex items-center justify-center text-[var(--text-tertiary)]"><Loader className="w-5 h-5 animate-spin mr-2" /> Loading estimate…</div>;
  }
  if (!est) {
    return (
      <div className="p-10 text-center">
        <p className="text-[var(--text-secondary)]">Estimate not found.</p>
        <button onClick={() => navigate('/dashboard/estimates')} className="mt-4 px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg text-sm">Back to Estimates</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/estimates')} className="p-2 hover:bg-[var(--bg-main)] rounded-xl">
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div className="w-12 h-12 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              {est.referenceNumber}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[est.status]}`}>{est.status}</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">{getPatientName(est.patient)} • {est.patient?.folderNumber || '—'}</p>
            {est.corporateAccount && (
              <p className="text-xs text-[var(--icon-cyan-text)] flex items-center gap-1 mt-0.5"><Briefcase className="w-3 h-3" /> {est.corporateAccount.companyName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm text-[var(--text-primary)]">
            <Printer className="w-4 h-4" /> Print
          </button>
          {est.status === 'DRAFT' && (
            <>
              <button onClick={() => navigate(`/dashboard/estimates/${est.id}/edit`)} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm text-[var(--text-primary)]">
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button disabled={busy} onClick={() => run(async () => {
                if (!(await confirmDialog({ title: 'Delete draft estimate', message: 'Delete this draft estimate?', confirmText: 'Delete' }))) return;
                await removeEstimate(est.id);
                navigate('/dashboard/estimates');
              }, 'Estimate deleted')} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white text-sm disabled:opacity-50 transition-colors">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
          {est.status === 'DRAFT' && (
            <button disabled={busy} onClick={() => run(() => sendEstimate(id!), 'Estimate sent')} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
              <Send className="w-4 h-4" /> Send
            </button>
          )}
          {est.status === 'SENT' && (
            <>
              <button disabled={busy} onClick={() => run(() => acceptEstimate(id!), 'Estimate accepted')} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-text)] text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button disabled={busy} onClick={handleReject} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-red-text)] text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {(est.status === 'APPROVED' || est.status === 'SENT') && (
            <button disabled={busy} onClick={() => setShowConvert(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-purple-text)] text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
              <Receipt className="w-4 h-4" /> Convert to Bill
            </button>
          )}
          {est.status === 'CONVERTED' && est.bill && (
            <button onClick={() => navigate(`/dashboard/billing/${est.bill!.id}/payment`)} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 text-sm">
              <Receipt className="w-4 h-4" /> View Bill {est.bill.billNumber}
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-main)] text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Unit (GHS)</th>
              <th className="px-4 py-3 text-right">VAT</th>
              <th className="px-4 py-3 text-right">Total (GHS)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {(est.items || []).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-[var(--text-primary)]">{it.description}{it.serviceCatalog?.code ? <span className="text-[var(--text-tertiary)] text-xs"> ({it.serviceCatalog.code})</span> : null}</td>
                <td className="px-4 py-3 text-center text-[var(--text-primary)]">{it.quantity}</td>
                <td className="px-4 py-3 text-right text-[var(--text-primary)]">{fmt(it.unitPrice)}</td>
                <td className="px-4 py-3 text-right text-[var(--text-primary)]">{fmt(it.vatAmount)}</td>
                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">{fmt(it.totalPrice)}</td>
              </tr>
            ))}
            {(!est.items || est.items.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-tertiary)]">No line items</td></tr>
            )}
          </tbody>
        </table>
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

      {/* Convert modal */}
      {showConvert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 w-full max-w-md border border-[var(--border-color)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Convert to Bill</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Create a bill from estimate {est.referenceNumber} (GHS {fmt(est.totalAmount)}).</p>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Payment mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] mb-5">
              {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConvert(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded-lg">Cancel</button>
              <button disabled={busy} onClick={handleConvert} className="px-4 py-2 text-sm bg-[var(--icon-purple-text)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">Convert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
