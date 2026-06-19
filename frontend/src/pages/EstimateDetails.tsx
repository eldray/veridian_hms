// src/pages/EstimateDetails.tsx - Proforma invoice (estimate) detail + actions
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEstimatesStore, type EstimateStatus } from '../store/estimatesStore';
import { useToast } from '../store/toastStore';
import { useHospitalStore } from '../store/hospitalStore';
import { getPatientName } from '../utils/patient';
import { openPrintWindow } from '../utils/pdfGenerator';
import {
  ArrowLeft, Send, CheckCircle, XCircle, FileText, Printer, Receipt, Loader, Briefcase,
} from 'lucide-react';

const STATUS_STYLES: Record<EstimateStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
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
    sendEstimate, acceptEstimate, rejectEstimate, convertToBill,
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

  const handleReject = () => {
    const reason = window.prompt('Reason for rejecting this estimate?') || undefined;
    if (reason === undefined) return;
    run(() => rejectEstimate(id!, reason), 'Estimate rejected');
  };

  const handleConvert = async () => {
    setShowConvert(false);
    await run(async () => {
      const bill = await convertToBill(id!, { paymentMode });
      if (bill?.id) navigate(`/dashboard/billing/${bill.id}/payment`);
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
    return <div className="p-10 flex items-center justify-center text-gray-400"><Loader className="w-5 h-5 animate-spin mr-2" /> Loading estimate…</div>;
  }
  if (!est) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500">Estimate not found.</p>
        <button onClick={() => navigate('/dashboard/estimates')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Back to Estimates</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/estimates')} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {est.referenceNumber}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[est.status]}`}>{est.status}</span>
            </h1>
            <p className="text-sm text-gray-500">{getPatientName(est.patient)} • {est.patient?.folderNumber || '—'}</p>
            {est.corporateAccount && (
              <p className="text-xs text-cyan-600 flex items-center gap-1 mt-0.5"><Briefcase className="w-3 h-3" /> {est.corporateAccount.companyName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
            <Printer className="w-4 h-4" /> Print
          </button>
          {est.status === 'DRAFT' && (
            <button disabled={busy} onClick={() => run(() => sendEstimate(id!), 'Estimate sent')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
              <Send className="w-4 h-4" /> Send
            </button>
          )}
          {est.status === 'SENT' && (
            <>
              <button disabled={busy} onClick={() => run(() => acceptEstimate(id!), 'Estimate accepted')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button disabled={busy} onClick={handleReject} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {est.status === 'APPROVED' && (
            <button disabled={busy} onClick={() => setShowConvert(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50">
              <Receipt className="w-4 h-4" /> Convert to Bill
            </button>
          )}
          {est.status === 'CONVERTED' && est.bill && (
            <button onClick={() => navigate(`/dashboard/billing/${est.bill!.id}/payment`)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              <Receipt className="w-4 h-4" /> View Bill {est.bill.billNumber}
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Unit (GHS)</th>
              <th className="px-4 py-3 text-right">VAT</th>
              <th className="px-4 py-3 text-right">Total (GHS)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(est.items || []).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-gray-900">{it.description}{it.serviceCatalog?.code ? <span className="text-gray-400 text-xs"> ({it.serviceCatalog.code})</span> : null}</td>
                <td className="px-4 py-3 text-center">{it.quantity}</td>
                <td className="px-4 py-3 text-right">{fmt(it.unitPrice)}</td>
                <td className="px-4 py-3 text-right">{fmt(it.vatAmount)}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(it.totalPrice)}</td>
              </tr>
            ))}
            {(!est.items || est.items.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No line items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full sm:w-80 bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>GHS {fmt(est.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>- GHS {fmt(est.discount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>GHS {fmt(est.taxAmount)}</span></div>
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900"><span>Total</span><span>GHS {fmt(est.totalAmount)}</span></div>
          {est.expiresAt && <p className="text-xs text-gray-400 pt-1">Valid until {new Date(est.expiresAt).toLocaleDateString()}</p>}
        </div>
      </div>

      {est.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
          <p className="text-xs text-gray-400 mb-1">Notes</p>{est.notes}
        </div>
      )}

      {/* Convert modal */}
      {showConvert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Convert to Bill</h3>
            <p className="text-sm text-gray-500 mb-4">Create a bill from estimate {est.referenceNumber} (GHS {fmt(est.totalAmount)}).</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-5">
              {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConvert(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button disabled={busy} onClick={handleConvert} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Convert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
