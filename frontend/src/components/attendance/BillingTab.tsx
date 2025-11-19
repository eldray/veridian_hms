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
import { useAttendanceStore } from '../../store/attendanceStore';

interface BillingTabProps {
  attendance: any;
}

export const BillingTab: React.FC<BillingTabProps> = ({ attendance }) => {
  const { nhisConfig } = useSettingsStore();
  const { submitNHISClaim, isLoading } = useAttendanceStore();

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
      // Generate XML first
      const claimData = await useAttendanceStore.getState().generateNHISClaim(attendance._id);
      setClaimXML(claimData.xml);
      setShowXML(true);

      // Submit to NHIS
      await submitNHISClaim(attendance._id);
      setShowClaimSuccess(true);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit NHIS claim');
    }
  };

  const copyXML = () => {
    navigator.clipboard.writeText(claimXML);
    alert('XML copied to clipboard!');
  };

  const downloadXML = () => {
    const blob = new Blob([claimXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NHIS_Claim_${attendance._id}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* NHIS Status Banner */}
        {isNHIS && (
          <div className={`rounded-lg p-3 border ${nhisConfig.isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${nhisConfig.isActive ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <h3 className="text-md font-bold text-gray-900">NHIS Billing</h3>
                <p className={`text-xs ${nhisConfig.isActive ? 'text-green-700' : 'text-red-700'}`}>
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
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Billing Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-gray-600 font-medium">Total Bill</span>
              <span className="font-bold text-lg text-gray-900">${totalBill.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-gray-600 font-medium">Paid Amount</span>
              <span className="font-bold text-lg text-green-600">${paidAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className={`flex justify-between items-center rounded-lg p-3 ${
                outstandingBalance > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <span className="font-bold text-gray-900">Balance</span>
                <span className={`font-bold text-xl ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${outstandingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NHIS Claim Success */}
        {showClaimSuccess && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-bold text-green-800 text-sm">NHIS Claim Submitted!</p>
                <p className="text-xs text-green-700">Attendance completed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Claim Error */}
        {claimError && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-bold text-red-800 text-sm">Claim Failed</p>
                <p className="text-xs text-red-700">{claimError}</p>
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 font-semibold text-sm shadow-md hover:shadow-lg transition-all"
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm">
              <CheckCircle className="w-4 h-4" />
              Completed
            </div>
          )}
        </div>

        {/* NHIS Details */}
        {isNHIS && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2 text-sm">NHIS Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">NHIS CCC</span>
                <span className="font-semibold text-gray-900">{attendance.nhisCCC || 'Not provided'}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Provider ID</span>
                <span className="font-semibold text-gray-900">{nhisConfig.providerId || 'Not set'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};