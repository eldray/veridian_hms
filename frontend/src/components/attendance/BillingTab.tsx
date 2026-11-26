// src/components/attendance/BillingTab.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Copy,
  Download
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useInsuranceStore } from '../../store/insuranceStore';

interface BillingTabProps {
  attendance: any;
}

export const BillingTab: React.FC<BillingTabProps> = ({ attendance }) => {
  const { nhisConfig } = useSettingsStore();
  const { generateNHISClaim, isLoading } = useInsuranceStore();

  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimXML, setClaimXML] = useState('');
  const [showXML, setShowXML] = useState(false);

  const totalBill = attendance.totalBill || 0;
  const paidAmount = attendance.paidAmount || 0;
  const outstandingBalance = totalBill - paidAmount;
  const isNHIS = attendance.paymentMode === 'nhis';
  const hasNHISCCC = !!attendance.nhisCCC;
  const isCompleted = attendance.status === 'completed';

  // Auto-apply insurance prices
  useEffect(() => {
    if (isNHIS && attendance.items) {
      attendance.items.forEach((item: any) => {
        if (item.insurancePrice && item.price !== item.insurancePrice) {
          item.price = item.insurancePrice;
        }
      });
    }
  }, [isNHIS, attendance.items]);

  const handleSubmitNHISClaim = async () => {
    if (isCompleted) return;

    setClaimError('');
    setShowClaimSuccess(false);
    setClaimXML('');

    try {
      const claimData = await generateNHISClaim(attendance.id);
      const xml = (claimData as any)?.xml ?? (claimData as any)?.claimXml ?? (claimData as any)?.data?.xml ?? '';
      if (xml) {
        setClaimXML(xml);
        setShowXML(true);
      }
      setShowClaimSuccess(true);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit NHIS claim');
    }
  };

  const copyXML = () => {
    // navigator.clipboard is unavailable on plain-http LAN addresses; fall back to the legacy copy command.
    const done = () => alert('XML copied to clipboard!');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(claimXML).then(done, () => alert('Could not copy to the clipboard.'));
      return;
    }
    const area = document.createElement('textarea');
    area.value = claimXML;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (copied) done(); else alert('Could not copy to the clipboard.');
  };

  const downloadXML = () => {
    const blob = new Blob([claimXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NHIS_Claim_${attendance.id}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* NHIS Status Banner */}
        {isNHIS && (
          <div className={`rounded-lg p-3 border ${nhisConfig.isActive ? 'bg-[var(--icon-green-bg)] border-[var(--border-color)]' : 'bg-[var(--icon-red-bg)] border-[var(--border-color)]'}`}>
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${nhisConfig.isActive ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'}`} />
              <div>
                <h3 className="text-md font-bold text-[var(--text-primary)]">NHIS Billing</h3>
                <p className={`text-xs ${nhisConfig.isActive ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'}`}>
                  {nhisConfig.isActive
                    ? hasNHISCCC
                      ? isCompleted
                        ? 'Claim submitted'
                        : 'Ready for claim'
                      : 'CCC required'
                    : 'NHIS not configured'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Summary */}
        <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 text-center">Billing Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)] font-medium">Total Bill</span>
              <span className="font-bold text-lg text-[var(--text-primary)]">${totalBill.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)] font-medium">Paid Amount</span>
              <span className="font-bold text-lg text-[var(--icon-green-text)]">${paidAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className={`flex justify-between items-center rounded-lg p-3 ${
                outstandingBalance > 0 ? 'bg-[var(--icon-red-bg)] border border-[var(--border-color)]' : 'bg-[var(--icon-green-bg)] border border-[var(--border-color)]'
              }`}>
                <span className="font-bold text-[var(--text-primary)]">Balance</span>
                <span className={`font-bold text-xl ${outstandingBalance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                  ${outstandingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NHIS Claim Success */}
        {showClaimSuccess && (
          <div className="bg-[var(--icon-green-bg)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />
              <div>
                <p className="font-bold text-[var(--icon-green-text)] text-sm">NHIS Claim Submitted!</p>
                <p className="text-xs text-[var(--icon-green-text)]">Attendance completed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Claim Error */}
        {claimError && (
          <div className="bg-[var(--icon-red-bg)] rounded-lg p-3 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--icon-red-text)]" />
              <div>
                <p className="font-bold text-[var(--icon-red-text)] text-sm">Claim Failed</p>
                <p className="text-xs text-[var(--icon-red-text)]">{claimError}</p>
              </div>
            </div>
          </div>
        )}

        {/* XML Preview */}
        {showXML && claimXML && (
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                NHIS Claim XML
              </h4>
              <div className="flex gap-1">
                <button
                  onClick={copyXML}
                  className="p-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                  title="Copy XML"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={downloadXML}
                  className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  title="Download XML"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <pre className="text-xs text-gray-300 overflow-x-auto p-2 bg-gray-800 rounded">
              {claimXML}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Cash Payment */}
          {outstandingBalance > 0 && !isNHIS && (
            <Link
              to={`/dashboard/billing/${attendance._id}/payment`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg font-semibold text-sm shadow-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)] transition-all"
            >
              <DollarSign className="w-4 h-4" />
              Process Payment
            </Link>
          )}

          {/* NHIS Submit Button */}
          {isNHIS && nhisConfig.isActive && hasNHISCCC && !isCompleted && (
            <button
              onClick={handleSubmitNHISClaim}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-white rounded-lg  font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Submit NHIS Claim
                </>
              )}
            </button>
          )}

          {/* Already Completed */}
          {isCompleted && (
            <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-lg font-semibold text-sm">
              <CheckCircle className="w-4 h-4" />
              Completed
            </div>
          )}
        </div>

        {/* NHIS Details */}
        {isNHIS && (
          <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-color)]">
            <h4 className="font-bold text-[var(--text-primary)] mb-2 text-sm">NHIS Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between p-2 bg-[var(--bg-main)] rounded">
                <span className="text-[var(--text-secondary)]">NHIS CCC</span>
                <span className="font-semibold text-[var(--text-primary)]">{attendance.nhisCCC || 'Not provided'}</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--bg-main)] rounded">
                <span className="text-[var(--text-secondary)]">Provider ID</span>
                <span className="font-semibold text-[var(--text-primary)]">{nhisConfig.providerId || 'Not set'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};