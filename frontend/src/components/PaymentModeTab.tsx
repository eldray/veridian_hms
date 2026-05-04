// src/components/PaymentModeTab.tsx
import {
  CreditCard,
  Shield,
  DollarSign,
  Info,
  Loader,
  AlertCircle,
  Plus,
  RefreshCw,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '../store/toastStore';
import type { PaymentMode, InsuranceDetails, InsuranceProvider } from '../types';
import { useState, useEffect } from 'react';
import NewAttendanceModal from './NewAttendanceModal';

interface PaymentModeTabProps {
  paymentMode?: PaymentMode;
  insuranceDetails?: InsuranceDetails;
  onPaymentModeChange: (mode?: PaymentMode) => void;
  onInsuranceDetailsChange: (details: InsuranceDetails) => void;
  insuranceProviders: InsuranceProvider[];
  isLoadingProviders?: boolean;
  isOptional?: boolean;
  patientId?: string;
  onRetryProviders?: () => void;
}

type ModeKey = 'cash' | 'nhis' | 'private_insurance';

const MODES: {
  key: ModeKey;
  label: string;
  shortLabel: string;
  subtitle: string;
  description: string;
  iconBg: string;
  iconText: string;
  activeBg: string;
  activeBorder: string;
  ctaBg: string;
  ctaHover: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    key: 'cash',
    label: 'Cash',
    shortLabel: 'Cash',
    subtitle: 'Direct payment',
    description:
      'Patient pays directly at the point of service. No insurance details are required — attendances can be created immediately.',
    iconBg: 'var(--icon-green-bg)',
    iconText: 'var(--icon-green-text)',
    activeBg: 'var(--icon-green-bg)',
    activeBorder: 'var(--icon-green-text)',
    ctaBg: 'var(--icon-green-text)',
    ctaHover: 'var(--icon-green-text)',
    badgeBg: 'var(--icon-green-bg)',
    badgeText: 'var(--icon-green-text)',
  },
  {
    key: 'nhis',
    label: 'NHIS',
    shortLabel: 'NHIS',
    subtitle: 'National scheme',
    description:
      'National Health Insurance Scheme. Requires a valid insurance number and active coverage dates before an attendance can be created.',
    iconBg: 'var(--icon-cyan-bg)',
    iconText: 'var(--icon-cyan-text)',
    activeBg: 'var(--icon-cyan-bg)',
    activeBorder: 'var(--icon-cyan-text)',
    ctaBg: 'var(--icon-cyan-text)',
    ctaHover: 'var(--icon-cyan-text)',
    badgeBg: 'var(--icon-cyan-bg)',
    badgeText: 'var(--icon-cyan-text)',
  },
  {
    key: 'private_insurance',
    label: 'Private Insurance',
    shortLabel: 'Private',
    subtitle: 'Insurance coverage',
    description:
      'Private insurance coverage. Select your provider from the list and enter the member\'s insurance number and coverage dates.',
    iconBg: 'var(--icon-purple-bg)',
    iconText: 'var(--icon-purple-text)',
    activeBg: 'var(--icon-purple-bg)',
    activeBorder: 'var(--icon-purple-text)',
    ctaBg: 'var(--icon-purple-text)',
    ctaHover: 'var(--icon-purple-text)',
    badgeBg: 'var(--icon-purple-bg)',
    badgeText: 'var(--icon-purple-text)',
  },
];

const ModeIcon = ({ modeKey, size = 20 }: { modeKey: ModeKey; size?: number }) => {
  const s = size;
  if (modeKey === 'cash')
    return <DollarSign style={{ width: s, height: s }} />;
  if (modeKey === 'nhis')
    return <Shield style={{ width: s, height: s }} />;
  return <CreditCard style={{ width: s, height: s }} />;
};

export default function PaymentModeTab({
  paymentMode,
  insuranceDetails,
  onPaymentModeChange,
  onInsuranceDetailsChange,
  insuranceProviders = [],
  isLoadingProviders = false,
  isOptional = false,
  patientId,
  onRetryProviders,
}: PaymentModeTabProps) {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('cash');
  const { error: toastError, success } = useToast();

  useEffect(() => {
    console.log('🔍 PaymentModeTab Debug:', {
      insuranceProviders,
      providersCount: insuranceProviders.length,
      paymentMode,
      isLoadingProviders,
    });
  }, [insuranceProviders, paymentMode, isLoadingProviders]);

  const safeInsurance: InsuranceDetails = insuranceDetails || {
    insuranceNumber: '',
    providerId: '',
    providerName: '',
    startDate: '',
    endDate: '',
  };

  const updateInsuranceField = (field: string, value: any) => {
    onInsuranceDetailsChange({ ...safeInsurance, [field]: value });
  };

  const isInsuranceValid = () => {
    if (!safeInsurance.insuranceNumber || !safeInsurance.startDate || !safeInsurance.endDate)
      return false;
    if (paymentMode === 'private_insurance' && !safeInsurance.providerId)
      return false;
    return true;
  };

  const handleAddAttendance = (mode: PaymentMode) => {
    if ((mode === 'nhis' || mode === 'private_insurance') && !isInsuranceValid()) {
      toastError('Insurance Required', 'Please complete all required insurance details before creating attendance');
      return;
    }
    onPaymentModeChange(mode);
    setSelectedPaymentMode(mode);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSuccess = (attendance: any) => {
    setShowAttendanceModal(false);
    success('Attendance Created', 'New visit has been created successfully');
  };

  const handleRetryProviders = () => {
    if (onRetryProviders) {
      onRetryProviders();
      success('Refreshing', 'Reloading insurance providers...');
    }
  };

  const privateProviders = insuranceProviders.filter(
    (p) => p.type === 'private' && p.isActive
  );

  const activeMode = MODES.find((m) => m.key === paymentMode) ?? null;
  const canCreateAttendance =
    paymentMode === 'cash' || (paymentMode && isInsuranceValid());

  if (!onPaymentModeChange || !onInsuranceDetailsChange) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        Missing required props for PaymentModeTab
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Attendance Modal */}
      {showAttendanceModal && patientId && (
        <NewAttendanceModal
          patientId={patientId}
          paymentMode={selectedPaymentMode}
          onSuccess={handleAttendanceSuccess}
          onClose={() => setShowAttendanceModal(false)}
          isEditMode={false}
        />
      )}

      {/* Optional banner */}
      {isOptional && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            background: 'var(--icon-cyan-bg)',
            border: '0.5px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <Info style={{ width: 15, height: 15, color: 'var(--icon-cyan-text)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--icon-cyan-text)', marginBottom: 2 }}>
              Payment mode is optional
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              You can set this now or add it later. Cash patients can create attendances immediately.
              Insurance patients must complete their details first.
            </p>
          </div>
        </div>
      )}

      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Select payment mode
            {!isOptional && (
              <span style={{ color: 'var(--icon-red-text)', marginLeft: 4, fontSize: 12 }}>*</span>
            )}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            Choose how this patient will pay for services
          </p>
        </div>
        {isOptional && paymentMode && (
          <button
            type="button"
            onClick={() => onPaymentModeChange(undefined)}
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Clear selection
          </button>
        )}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr',
          gap: '12px',
          alignItems: 'start',
        }}
      >
        {/* LEFT: mode sidebar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'var(--bg-main)',
            border: '0.5px solid var(--border-color)',
            borderRadius: '12px',
            padding: '8px',
          }}
        >
          {MODES.map((mode) => {
            const isActive = paymentMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onPaymentModeChange(mode.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 10px',
                  borderRadius: '8px',
                  border: isActive
                    ? `1.5px solid ${mode.activeBorder}`
                    : '1.5px solid transparent',
                  background: isActive ? mode.activeBg : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'var(--bg-card)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {/* icon pip */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    background: isActive ? mode.iconBg : 'var(--bg-card)',
                    border: '0.5px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isActive ? mode.iconText : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  <ModeIcon modeKey={mode.key} size={14} />
                </div>

                {/* labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {mode.shortLabel}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      lineHeight: 1.3,
                      margin: 0,
                      marginTop: 1,
                    }}
                  >
                    {mode.subtitle}
                  </p>
                </div>

                {/* active chevron */}
                {isActive && (
                  <ChevronRight
                    style={{
                      width: 12,
                      height: 12,
                      color: mode.iconText,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT: detail panel */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* No mode selected */}
          {!paymentMode && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                minHeight: 220,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'var(--bg-main)',
                  border: '0.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <CreditCard style={{ width: 20, height: 20, color: 'var(--text-tertiary)' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                No payment mode selected
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Select a mode from the left to see details and create an attendance.
              </p>
            </div>
          )}

          {/* Panel content for selected mode */}
          {activeMode && (
            <>
              {/* Panel header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '0.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: activeMode.activeBg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      border: `1px solid ${activeMode.activeBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: activeMode.iconText,
                    }}
                  >
                    <ModeIcon modeKey={activeMode.key} size={15} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                      {activeMode.label}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0, marginTop: 1 }}>
                      {activeMode.subtitle}
                    </p>
                  </div>
                </div>

                {/* status badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: canCreateAttendance
                      ? activeMode.badgeBg
                      : 'var(--icon-yellow-bg)',
                    color: canCreateAttendance
                      ? activeMode.badgeText
                      : 'var(--icon-yellow-text)',
                    border: '0.5px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {canCreateAttendance ? (
                    <CheckCircle style={{ width: 10, height: 10 }} />
                  ) : (
                    <AlertCircle style={{ width: 10, height: 10 }} />
                  )}
                  {canCreateAttendance ? 'Ready' : 'Incomplete'}
                </span>
              </div>

              <div style={{ padding: '16px' }}>

                {/* Description */}
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
                  {activeMode.description}
                </p>

                {/* ── CASH: just the CTA ── */}
                {activeMode.key === 'cash' && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        background: 'var(--icon-green-bg)',
                        border: '0.5px solid var(--border-color)',
                        borderRadius: '8px',
                        marginBottom: 12,
                      }}
                    >
                      <CheckCircle style={{ width: 13, height: 13, color: 'var(--icon-green-text)', flexShrink: 0 }} />
                      <p style={{ fontSize: 11, color: 'var(--icon-green-text)', margin: 0 }}>
                        No insurance details required. Ready to create an attendance immediately.
                      </p>
                    </div>

                    {patientId && (
                      <button
                        type="button"
                        onClick={() => handleAddAttendance('cash')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          width: '100%',
                          padding: '9px 0',
                          background: 'var(--icon-green-text)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus style={{ width: 13, height: 13 }} />
                        Create cash attendance
                      </button>
                    )}
                  </div>
                )}

                {/* ── NHIS insurance form ── */}
                {activeMode.key === 'nhis' && (
                  <NHISForm
                    safeInsurance={safeInsurance}
                    updateInsuranceField={updateInsuranceField}
                    isInsuranceValid={isInsuranceValid}
                    patientId={patientId}
                    handleAddAttendance={handleAddAttendance}
                    activeMode={activeMode}
                  />
                )}

                {/* ── Private insurance form ── */}
                {activeMode.key === 'private_insurance' && (
                  <PrivateForm
                    safeInsurance={safeInsurance}
                    updateInsuranceField={updateInsuranceField}
                    isInsuranceValid={isInsuranceValid}
                    patientId={patientId}
                    handleAddAttendance={handleAddAttendance}
                    activeMode={activeMode}
                    isLoadingProviders={isLoadingProviders}
                    privateProviders={privateProviders}
                    onRetryProviders={onRetryProviders}
                    handleRetryProviders={handleRetryProviders}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NHIS sub-form ─────────────────────────────────────────────────────────────
function NHISForm({
  safeInsurance,
  updateInsuranceField,
  isInsuranceValid,
  patientId,
  handleAddAttendance,
  activeMode,
}: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FormRow>
        <FormField label="Insurance number *">
          <input
            type="text"
            required
            value={safeInsurance.insuranceNumber}
            onChange={(e) => updateInsuranceField('insuranceNumber', e.target.value)}
            placeholder="e.g. NHIS-00123456"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Provider name">
          <input
            type="text"
            value={safeInsurance.providerName || 'NHIS'}
            onChange={(e) => updateInsuranceField('providerName', e.target.value)}
            placeholder="NHIS"
            style={inputStyle}
          />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Start date *">
          <input
            type="date"
            required
            value={safeInsurance.startDate}
            onChange={(e) => updateInsuranceField('startDate', e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="End date *">
          <input
            type="date"
            required
            value={safeInsurance.endDate}
            onChange={(e) => updateInsuranceField('endDate', e.target.value)}
            style={inputStyle}
          />
        </FormField>
      </FormRow>

      <InsuranceNote />

      {patientId && (
        <CtaButton
          valid={isInsuranceValid()}
          label="Create NHIS attendance"
          bg={activeMode.ctaBg}
          onClick={() => handleAddAttendance('nhis')}
        />
      )}
    </div>
  );
}

// ── Private insurance sub-form ────────────────────────────────────────────────
function PrivateForm({
  safeInsurance,
  updateInsuranceField,
  isInsuranceValid,
  patientId,
  handleAddAttendance,
  activeMode,
  isLoadingProviders,
  privateProviders,
  onRetryProviders,
  handleRetryProviders,
}: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FormRow>
        <FormField label="Insurance number *">
          <input
            type="text"
            required
            value={safeInsurance.insuranceNumber}
            onChange={(e) => updateInsuranceField('insuranceNumber', e.target.value)}
            placeholder="e.g. MEM-00098765"
            style={inputStyle}
          />
        </FormField>

        <FormField label="Insurance provider *">
          {isLoadingProviders ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} className="animate-spin" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading providers…</span>
            </div>
          ) : privateProviders.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 10px',
                  background: 'var(--icon-yellow-bg)',
                  border: '0.5px solid var(--border-color)',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--icon-yellow-text)',
                }}
              >
                <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} />
                No private providers found.
              </div>
              {onRetryProviders && (
                <button
                  type="button"
                  onClick={handleRetryProviders}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    background: 'var(--bg-main)',
                    border: '0.5px solid var(--border-color)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    width: 'fit-content',
                  }}
                >
                  <RefreshCw style={{ width: 11, height: 11 }} />
                  Retry
                </button>
              )}
            </div>
          ) : (
            <select
              required
              value={safeInsurance.providerId}
              onChange={(e) => updateInsuranceField('providerId', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select provider</option>
              {privateProviders.map((p: any) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                  {p.coveragePercentage ? ` — ${p.coveragePercentage}% coverage` : ''}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Start date *">
          <input
            type="date"
            required
            value={safeInsurance.startDate}
            onChange={(e) => updateInsuranceField('startDate', e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="End date *">
          <input
            type="date"
            required
            value={safeInsurance.endDate}
            onChange={(e) => updateInsuranceField('endDate', e.target.value)}
            style={inputStyle}
          />
        </FormField>
      </FormRow>

      <InsuranceNote />

      {patientId && (
        <CtaButton
          valid={isInsuranceValid()}
          label="Create insurance attendance"
          bg={activeMode.ctaBg}
          onClick={() => handleAddAttendance('private_insurance')}
        />
      )}
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────────
function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function InsuranceNote() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 7,
        padding: '9px 11px',
        background: 'var(--icon-yellow-bg)',
        border: '0.5px solid var(--border-color)',
        borderRadius: 8,
      }}
    >
      <Info style={{ width: 12, height: 12, color: 'var(--icon-yellow-text)', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 11, color: 'var(--icon-yellow-text)', margin: 0, lineHeight: 1.6 }}>
        Insurance must be active and unexpired. Patients with expired coverage cannot create new attendances.
      </p>
    </div>
  );
}

function CtaButton({
  valid,
  label,
  bg,
  onClick,
}: {
  valid: boolean;
  label: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!valid}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        padding: '9px 0',
        background: valid ? bg : 'var(--bg-main)',
        color: valid ? '#fff' : 'var(--text-tertiary)',
        border: valid ? 'none' : '0.5px solid var(--border-color)',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        cursor: valid ? 'pointer' : 'not-allowed',
        transition: 'opacity 0.15s',
        opacity: valid ? 1 : 0.6,
        marginTop: 2,
      }}
    >
      <Plus style={{ width: 13, height: 13 }} />
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '0.5px solid var(--border-color)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
  background: 'var(--bg-main)',
  outline: 'none',
};