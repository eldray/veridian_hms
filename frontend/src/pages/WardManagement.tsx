// src/pages/WardManagement.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWardStore } from '../store/wardStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus, Search, Building, Bed, Edit, Trash2, RefreshCw, UserCheck,
  UserX, Users, ArrowLeft, Loader2, DollarSign, Shield, CheckCircle,
  XCircle, TrendingUp, Clock, AlertTriangle, LayoutGrid, List, MapPin,
  Filter, X, Info, Percent, FileText, Stethoscope,
} from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getEntityId = (entity: { id?: string; _id?: string } | null | undefined): string | undefined =>
  entity?._id || entity?.id;

const formatCurrency = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `GHS ${n.toFixed(2)}`;
};

const parseNumericInput = (value: string, fallback = 0): number => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseIntegerInput = (value: string, fallback = 1): number => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

type ViewMode = 'grid' | 'list';

interface WardFormState {
  wardName: string;
  wardType: string;
  totalBeds: number;
  description: string;
  location: string;
  floor: string;
  dailyCashRate: number;
  dailyNHISRate: number;
  dailyInsuranceRate: number;
  vatRate: number;
  isTaxable: boolean;
  isNHISCovered: boolean;
  nhisRequiresAuth: boolean;
  isPrivateInsExempted: boolean;
  requiresAuthorization: boolean;
  tariffCode: string;
}

const EMPTY_WARD_FORM: WardFormState = {
  wardName: '',
  wardType: 'general',
  totalBeds: 10,
  description: '',
  location: '',
  floor: '',
  dailyCashRate: 150,
  dailyNHISRate: 120,
  dailyInsuranceRate: 135,
  vatRate: 15,
  isTaxable: true,
  isNHISCovered: true,
  nhisRequiresAuth: false,
  isPrivateInsExempted: false,
  requiresAuthorization: false,
  tariffCode: '',
};

const WARD_TYPES = [
  { value: 'general',   label: 'General' },
  { value: 'private',   label: 'Private' },
  { value: 'icu',       label: 'ICU' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'surgical',  label: 'Surgical' },
  { value: 'medical',   label: 'Medical' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'isolation', label: 'Isolation' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Theme-aware style helpers
// ─────────────────────────────────────────────────────────────────────────────

const wardTypeStyle = (type: string): { bg: string; color: string; icon: JSX.Element } => {
  switch (type?.toLowerCase()) {
    case 'icu':
      return { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', icon: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--icon-red-text)' }} /> };
    case 'maternity':
      return { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', icon: <Users className="w-5 h-5" style={{ color: 'var(--icon-red-text)' }} /> };
    case 'pediatric':
      return { bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', icon: <Users className="w-5 h-5" style={{ color: 'var(--icon-cyan-text)' }} /> };
    case 'surgical':
      return { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', icon: <Stethoscope className="w-5 h-5" style={{ color: 'var(--icon-orange-text)' }} /> };
    case 'private':
      return { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', icon: <Shield className="w-5 h-5" style={{ color: 'var(--icon-green-text)' }} /> };
    case 'medical':
      return { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', icon: <Building className="w-5 h-5" style={{ color: 'var(--icon-purple-text)' }} /> };
    case 'emergency':
      return { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', icon: <Clock className="w-5 h-5" style={{ color: 'var(--icon-yellow-text)' }} /> };
    case 'isolation':
      return { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', icon: <Shield className="w-5 h-5" style={{ color: 'var(--icon-purple-text)' }} /> };
    default:
      return { bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', icon: <Building className="w-5 h-5" style={{ color: 'var(--icon-cyan-text)' }} /> };
  }
};

const occupancyStyle = (rate: number): { bg: string; color: string; bar: string } => {
  if (rate > 80) return { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', bar: 'var(--icon-red-text)' };
  if (rate > 60) return { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', bar: 'var(--icon-orange-text)' };
  return { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', bar: 'var(--icon-green-text)' };
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
  boxShadow: 'var(--shadow-sm)',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-main)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {children} {required && <span style={{ color: 'var(--icon-red-text)' }}>*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text', min, max, step, autoFocus, required,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      autoFocus={autoFocus}
      required={required}
      className="w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2"
      style={{
        ...inputStyle,
        // @ts-expect-error focus ring via CSS var
        '--tw-ring-color': 'var(--icon-cyan-text)',
      }}
    />
  );
}

function StatTile({
  Icon, iconBg, iconColor, value, label, sub, valueColor,
}: {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  value: React.ReactNode;
  label: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl p-4 border" style={cardStyle}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: valueColor || 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}

function ModalShell({
  isOpen, onClose, title, subtitle, Icon, children, footer, maxWidth = 'max-w-2xl',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  Icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ward-modal-title"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${maxWidth} rounded-2xl border overflow-hidden`}
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}
        >
          <div
            className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {Icon}
              <div className="min-w-0">
                <h2 id="ward-modal-title" className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto">{children}</div>
          {footer && (
            <div
              className="sticky bottom-0 border-t px-6 py-4 flex justify-end gap-2"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function WardManagement() {
  const {
    wards, beds, getWards, getBeds, createWard, updateWard, deleteWard,
    createBed, deleteBed, isLoading, getAvailableBeds,
  } = useWardStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('wardViewMode');
    return (saved as ViewMode) || 'grid';
  });
  const [showFilters, setShowFilters] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);

  const [showWardForm, setShowWardForm] = useState(false);
  const [showBedForm, setShowBedForm] = useState(false);
  const [showWardDetails, setShowWardDetails] = useState(false);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [wardFormData, setWardFormData] = useState<WardFormState>(EMPTY_WARD_FORM);
  const [bedFormData, setBedFormData] = useState({ bedNumber: '', wardId: '' });

  // Confirmation modals (replaces window.confirm)
  const [pendingDeleteWard, setPendingDeleteWard] = useState<any>(null);
  const [pendingDeleteBed, setPendingDeleteBed] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageWards = user?.role === 'admin' || user?.role === 'super_admin';

  // ── Data loading (silent — no toast spam) ────────────────────────────────
  const loadData = useCallback(async () => {
    setLocalLoading(true);
    try {
      await Promise.all([
        getWards(),
        getBeds(),
        getAvailableBeds().catch(() => null),
      ]);
    } catch (err: any) {
      error('Load Failed', err?.message || 'Failed to load ward data');
    } finally {
      setLocalLoading(false);
    }
  }, [getWards, getBeds, getAvailableBeds, error]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { localStorage.setItem('wardViewMode', viewMode); }, [viewMode]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const filteredWards = useMemo(() => wards.filter(ward => {
    const matchesSearch = ward.wardName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || ward.wardType === filterType;
    return matchesSearch && matchesType;
  }), [wards, searchTerm, filterType]);

  const getWardBeds = useCallback((wardId: string) =>
    beds.filter(bed => bed.wardId === wardId || bed.ward?.id === wardId),
  [beds]);

  const getOccupiedBeds = useCallback((wardId: string) =>
    getWardBeds(wardId).filter(bed => Boolean(bed.isOccupied)).length,
  [getWardBeds]);

  const getAvailableBedsCount = useCallback((wardId: string) => {
    const wardBeds = getWardBeds(wardId);
    return wardBeds.length - getOccupiedBeds(wardId);
  }, [getWardBeds, getOccupiedBeds]);

  const totalBeds = beds.length;
  const totalOccupied = beds.filter(b => Boolean(b.isOccupied)).length;
  const totalAvailable = totalBeds - totalOccupied;
  const overallOccupancy = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;

  // ── Form handlers ────────────────────────────────────────────────────────
  const resetWardForm = () => setWardFormData(EMPTY_WARD_FORM);
  const resetBedForm = () => setBedFormData({ bedNumber: '', wardId: '' });

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWard) {
        await updateWard(getEntityId(editingWard)!, wardFormData);
        success('Ward Updated', 'Ward updated successfully');
      } else {
        await createWard(wardFormData);
        success('Ward Created', 'Ward created successfully');
      }
      setShowWardForm(false);
      setEditingWard(null);
      resetWardForm();
      await loadData();
    } catch (err: any) {
      error('Save Failed', err?.response?.data?.message || err?.message || 'Failed to save ward');
    }
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBed(bedFormData);
      success('Bed Created', 'Bed created successfully');
      setShowBedForm(false);
      resetBedForm();
      setSelectedWard(null);
      await loadData();
    } catch (err: any) {
      error('Create Failed', err?.response?.data?.message || err?.message || 'Failed to create bed');
    }
  };

  const handleEditWard = (ward: any) => {
    setEditingWard(ward);
    setWardFormData({
      wardName: ward.wardName || '',
      wardType: ward.wardType || 'general',
      totalBeds: ward.totalBeds || 10,
      description: ward.description || '',
      location: ward.location || '',
      floor: ward.floor || '',
      dailyCashRate: ward.dailyCashRate || 0,
      dailyNHISRate: ward.dailyNHISRate || 0,
      dailyInsuranceRate: ward.dailyInsuranceRate || 0,
      vatRate: ward.vatRate || 0,
      isTaxable: ward.isTaxable ?? true,
      isNHISCovered: ward.isNHISCovered ?? true,
      nhisRequiresAuth: ward.nhisRequiresAuth || false,
      isPrivateInsExempted: ward.isPrivateInsExempted || false,
      requiresAuthorization: ward.requiresAuthorization || false,
      tariffCode: ward.tariffCode || '',
    });
    setShowWardForm(true);
  };

  const handleViewWardDetails = (ward: any) => {
    setSelectedWard(ward);
    setShowWardDetails(true);
  };

  const handleAddBedToWard = (ward: any) => {
    const wardId = getEntityId(ward)!;
    const wardBeds = getWardBeds(wardId);
    if (ward.totalBeds && wardBeds.length >= ward.totalBeds) {
      error('Ward Full', `This ward is configured for ${ward.totalBeds} beds. Increase the total or remove a bed first.`);
      return;
    }
    setSelectedWard(ward);
    setBedFormData({ bedNumber: '', wardId });
    setShowBedForm(true);
  };

  // ── Delete handlers (via ConfirmationModal) ──────────────────────────────
  const confirmDeleteWard = async () => {
    if (!pendingDeleteWard) return;
    setIsDeleting(true);
    try {
      await deleteWard(getEntityId(pendingDeleteWard)!);
      success('Ward Deleted', 'Ward deleted successfully');
      setPendingDeleteWard(null);
      await loadData();
    } catch (err: any) {
      error('Delete Failed', err?.response?.data?.message || err?.message || 'Failed to delete ward');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteBed = async () => {
    if (!pendingDeleteBed) return;
    setIsDeleting(true);
    try {
      await deleteBed(getEntityId(pendingDeleteBed)!);
      success('Bed Deleted', 'Bed deleted successfully');
      setPendingDeleteBed(null);
      await loadData();
    } catch (err: any) {
      error('Delete Failed', err?.response?.data?.message || err?.message || 'Failed to delete bed');
    } finally {
      setIsDeleting(false);
    }
  };

  const requestDeleteBed = (bed: any) => {
    if (bed.isOccupied) {
      error('Cannot Delete', 'Cannot delete an occupied bed. Discharge the patient first.');
      return;
    }
    setPendingDeleteBed(bed);
  };

  // ── Initial full-page loader only on cold start ──────────────────────────
  if (localLoading && wards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: 'var(--icon-cyan-text)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading wards and beds...</p>
      </div>
    );
  }

  const wardDeleteBedCount = pendingDeleteWard ? getWardBeds(getEntityId(pendingDeleteWard)!).length : 0;

  return (
    <div className="space-y-5 p-4 sm:p-6" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Ward Management
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Manage hospital wards and bed allocation
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            to="/dashboard/admissions"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">View</span> Admissions
          </Link>
          {canManageWards && (
            <button
              onClick={() => { resetWardForm(); setEditingWard(null); setShowWardForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: 'var(--icon-cyan-text)', boxShadow: 'var(--shadow-sm)' }}
            >
              <Plus className="w-4 h-4" />
              Add Ward
            </button>
          )}
        </div>
      </div>

{/* ── Stats tiles ─────────────────────────────────────────────────── */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {/* Wards */}
  <div className="rounded-xl px-4 py-3.5 border" style={cardStyle}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Total</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--icon-cyan-bg)' }}>
        <Building className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
      </div>
    </div>
    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{wards.length}</p>
    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Wards</p>
  </div>

  {/* All Beds */}
  <div className="rounded-xl px-4 py-3.5 border" style={cardStyle}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>All Beds</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--icon-purple-bg)' }}>
        <Bed className="w-4 h-4" style={{ color: 'var(--icon-purple-text)' }} />
      </div>
    </div>
    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalBeds}</p>
    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Total capacity</p>
  </div>

  {/* Available */}
  <div className="rounded-xl px-4 py-3.5 border" style={cardStyle}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Available</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--icon-green-bg)' }}>
        <UserCheck className="w-4 h-4" style={{ color: 'var(--icon-green-text)' }} />
      </div>
    </div>
    <p className="text-xl font-bold" style={{ color: 'var(--icon-green-text)' }}>{totalAvailable}</p>
    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Ready for use</p>
  </div>

  {/* Occupancy */}
  <div className="rounded-xl px-4 py-3.5 border" style={cardStyle}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Occupancy</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: occupancyStyle(overallOccupancy).bg }}>
        <TrendingUp className="w-4 h-4" style={{ color: occupancyStyle(overallOccupancy).color }} />
      </div>
    </div>
    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overallOccupancy.toFixed(0)}%</p>
    <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(overallOccupancy, 100)}%`, background: occupancyStyle(overallOccupancy).bar }}
      />
    </div>
  </div>
</div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border" style={cardStyle}>
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search wards by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
                style={inputStyle}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2.5 border rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="all">All Types</option>
                {WARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <button
                onClick={loadData}
                disabled={isLoading}
                aria-label="Refresh"
                title="Refresh"
                className="p-2.5 border rounded-lg transition-all disabled:opacity-50"
                style={{ ...inputStyle, background: 'var(--bg-card)' }}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <div className="flex items-center rounded-lg p-1" style={{ background: 'var(--bg-main)' }}>
                {(['grid', 'list'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                    style={
                      viewMode === mode
                        ? { background: 'var(--bg-card)', color: 'var(--icon-cyan-text)', boxShadow: 'var(--shadow-sm)' }
                        : { color: 'var(--text-secondary)' }
                    }
                    title={`${mode.charAt(0).toUpperCase()}${mode.slice(1)} View`}
                  >
                    {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    {mode === 'grid' ? 'Grid' : 'List'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium"
              style={{ ...inputStyle, background: 'var(--bg-card)' }}
            >
              <Filter className="w-4 h-4" />
              Filters
              {filterType !== 'all' && (
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--icon-cyan-text)' }} />
              )}
            </button>
          </div>

          {/* Mobile expanded filters */}
          {showFilters && (
            <div className="lg:hidden mt-3 pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="all">All Types</option>
                {WARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium"
                  style={{ ...inputStyle, background: 'var(--bg-card)' }}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <div className="flex items-center rounded-lg p-1" style={{ background: 'var(--bg-main)' }}>
                  {(['grid', 'list'] as ViewMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                      style={
                        viewMode === mode
                          ? { background: 'var(--bg-card)', color: 'var(--icon-cyan-text)', boxShadow: 'var(--shadow-sm)' }
                          : { color: 'var(--text-secondary)' }
                      }
                    >
                      {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active filters indicator */}
          {(searchTerm || filterType !== 'all') && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Active filters:</span>
              {searchTerm && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                  style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
                >
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} aria-label="Clear search filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterType !== 'all' && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium capitalize"
                  style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
                >
                  Type: {filterType}
                  <button onClick={() => setFilterType('all')} aria-label="Clear type filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                {filteredWards.length} of {wards.length} wards
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {filteredWards.length === 0 ? (
        <div className="rounded-xl p-12 text-center border" style={cardStyle}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-main)' }}
          >
            <Building className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {searchTerm || filterType !== 'all' ? 'No wards match your filters' : 'No wards configured yet'}
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first ward'}
          </p>
          {canManageWards && !searchTerm && filterType === 'all' && (
            <button
              onClick={() => { resetWardForm(); setEditingWard(null); setShowWardForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              <Plus className="w-4 h-4" />
              Create First Ward
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (

        /* ═══════════════ GRID VIEW ═══════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredWards.map((ward) => {
            const wardId = getEntityId(ward)!;
            const wardBeds = getWardBeds(wardId);
            const occupiedBeds = getOccupiedBeds(wardId);
            const availableBedsCount = wardBeds.length - occupiedBeds;
            const occupancyRate = wardBeds.length > 0 ? (occupiedBeds / wardBeds.length) * 100 : 0;
            const typeMeta = wardTypeStyle(ward.wardType);

            return (
              <div
                key={wardId}
                role="button"
                tabIndex={0}
                aria-label={`View ${ward.wardName} details`}
                className="rounded-xl border transition-all overflow-hidden cursor-pointer group focus:outline-none focus:ring-2"
                style={cardStyle}
                onClick={() => handleViewWardDetails(ward)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewWardDetails(ward); }
                }}
              >
                {/* Header */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: typeMeta.bg }}>
                        {typeMeta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{ward.wardName}</h3>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 border capitalize"
                          style={{ background: typeMeta.bg, color: typeMeta.color, borderColor: 'var(--border-color)' }}
                        >
                          {ward.wardType || 'General'}
                        </span>
                      </div>
                    </div>
                    {canManageWards && (
                      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditWard(ward)}
                          aria-label={`Edit ${ward.wardName}`}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDeleteWard(ward)}
                          aria-label={`Delete ${ward.wardName}`}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Occupancy</span>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: occupancyStyle(occupancyRate).bg, color: occupancyStyle(occupancyRate).color }}
                      >
                        {occupancyRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(occupancyRate, 100)}%`, background: occupancyStyle(occupancyRate).bar }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-main)' }}>
                      <Bed className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: 'var(--text-tertiary)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{wardBeds.length}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'var(--icon-green-bg)' }}>
                      <UserCheck className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: 'var(--icon-green-text)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--icon-green-text)' }}>{availableBedsCount}</p>
                      <p className="text-[10px]" style={{ color: 'var(--icon-green-text)' }}>Free</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'var(--icon-red-bg)' }}>
                      <UserX className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: 'var(--icon-red-text)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--icon-red-text)' }}>{occupiedBeds}</p>
                      <p className="text-[10px]" style={{ color: 'var(--icon-red-text)' }}>Used</p>
                    </div>
                  </div>

                  <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: 'var(--bg-main)' }}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <DollarSign className="w-3 h-3" /> Cash
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ward.dailyCashRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <Shield className="w-3 h-3" /> NHIS
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ward.dailyNHISRate)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {ward.isNHISCovered && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                        style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', borderColor: 'var(--border-color)' }}
                      >
                        <Shield className="w-2.5 h-2.5" /> NHIS
                      </span>
                    )}
                    {!ward.isPrivateInsExempted && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                        style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', borderColor: 'var(--border-color)' }}
                      >
                        <CheckCircle className="w-2.5 h-2.5" /> Insurance
                      </span>
                    )}
                    {ward.isTaxable && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                        style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', borderColor: 'var(--border-color)' }}
                      >
                        <Percent className="w-2.5 h-2.5" /> VAT {ward.vatRate}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Beds preview */}
                <div className="border-t p-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Bed className="w-3 h-3" />
                      Beds ({wardBeds.length})
                    </h4>
                    {canManageWards && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddBedToWard(ward); }}
                        className="inline-flex items-center gap-1 font-medium text-[10px]"
                        style={{ color: 'var(--icon-cyan-text)' }}
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {wardBeds.slice(0, 6).map((bed) => {
                      const occupied = Boolean(bed.isOccupied);
                      return (
                        <div
                          key={getEntityId(bed)}
                          className="relative group/bed p-1.5 rounded text-center text-[10px] font-bold transition-all"
                          style={
                            occupied
                              ? { background: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', border: '1px solid var(--border-color)' }
                              : { background: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', border: '1px solid var(--border-color)' }
                          }
                          title={occupied ? `Occupied by ${bed.currentPatient?.fullName || 'patient'}` : 'Available'}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {bed.bedNumber}
                          {canManageWards && !occupied && (
                            <button
                              onClick={(e) => { e.stopPropagation(); requestDeleteBed(bed); }}
                              aria-label={`Delete bed ${bed.bedNumber}`}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-opacity opacity-0 group-hover/bed:opacity-100 focus:opacity-100"
                              style={{ background: 'var(--icon-red-text)' }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {wardBeds.length > 6 && (
                      <div
                        className="p-1.5 rounded text-center text-[10px] font-medium border"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
                      >
                        +{wardBeds.length - 6}
                      </div>
                    )}
                    {wardBeds.length === 0 && (
                      <div className="col-span-6 text-center text-[10px] py-2" style={{ color: 'var(--text-tertiary)' }}>
                        No beds configured
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (

        /* ═══════════════ LIST VIEW ═══════════════ */
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div
            className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
          >
            <div className="col-span-3">Ward</div>
            <div className="col-span-1 text-center">Beds</div>
            <div className="col-span-2 text-center">Availability</div>
            <div className="col-span-2">Pricing</div>
            <div className="col-span-2">Coverage</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filteredWards.map((ward) => {
            const wardId = getEntityId(ward)!;
            const wardBeds = getWardBeds(wardId);
            const occupiedBeds = getOccupiedBeds(wardId);
            const availableBedsCount = wardBeds.length - occupiedBeds;
            const occupancyRate = wardBeds.length > 0 ? (occupiedBeds / wardBeds.length) * 100 : 0;
            const typeMeta = wardTypeStyle(ward.wardType);

            return (
              <div
                key={wardId}
                role="button"
                tabIndex={0}
                className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-5 py-4 transition-colors cursor-pointer group items-center border-b last:border-b-0 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => handleViewWardDetails(ward)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewWardDetails(ward); }
                }}
              >
                <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: typeMeta.bg }}>
                    {typeMeta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate text-sm" style={{ color: 'var(--text-primary)' }}>{ward.wardName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border capitalize"
                        style={{ background: typeMeta.bg, color: typeMeta.color, borderColor: 'var(--border-color)' }}
                      >
                        {ward.wardType || 'General'}
                      </span>
                      {ward.location && (
                        <span className="text-[10px] flex items-center gap-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                          <MapPin className="w-2.5 h-2.5" />
                          {ward.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 flex lg:justify-center items-center gap-2">
                  <span className="lg:hidden text-xs" style={{ color: 'var(--text-secondary)' }}>Total Beds:</span>
                  <span className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                    <Bed className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    {wardBeds.length}
                  </span>
                </div>

                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--icon-green-text)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{availableBedsCount} free</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--icon-red-text)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{occupiedBeds} used</span>
                    </div>
                  </div>
                  <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(occupancyRate, 100)}%`, background: occupancyStyle(occupancyRate).bar }}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 flex lg:block items-center gap-4">
                  <div className="text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>Cash: </span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ward.dailyCashRate)}</span>
                  </div>
                  <div className="text-xs lg:mt-1">
                    <span style={{ color: 'var(--text-secondary)' }}>NHIS: </span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ward.dailyNHISRate)}</span>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-wrap gap-1">
                  {ward.isNHISCovered && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)', borderColor: 'var(--border-color)' }}
                    >
                      <Shield className="w-2.5 h-2.5" /> NHIS
                    </span>
                  )}
                  {!ward.isPrivateInsExempted && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', borderColor: 'var(--border-color)' }}
                    >
                      <CheckCircle className="w-2.5 h-2.5" /> Insurance
                    </span>
                  )}
                  {ward.isTaxable && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', borderColor: 'var(--border-color)' }}
                    >
                      <Percent className="w-2.5 h-2.5" /> VAT {ward.vatRate}%
                    </span>
                  )}
                </div>

                <div className="lg:col-span-2 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {canManageWards && (
                    <>
                      <button
                        onClick={() => handleAddBedToWard(ward)}
                        aria-label={`Add bed to ${ward.wardName}`}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditWard(ward)}
                        aria-label={`Edit ${ward.wardName}`}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPendingDeleteWard(ward)}
                        aria-label={`Delete ${ward.wardName}`}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ Ward Details Modal ═══════════ */}
      <ModalShell
        isOpen={showWardDetails && !!selectedWard}
        onClose={() => { setShowWardDetails(false); setSelectedWard(null); }}
        title={selectedWard?.wardName || ''}
        subtitle={selectedWard ? `${selectedWard.wardType} Ward` : ''}
        Icon={
          selectedWard && (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: wardTypeStyle(selectedWard.wardType).bg }}>
              {wardTypeStyle(selectedWard.wardType).icon}
            </div>
          )
        }
        footer={
          canManageWards && selectedWard ? (
            <>
              <button
                onClick={() => { setShowWardDetails(false); setSelectedWard(null); }}
                className="px-4 py-2 border rounded-lg text-sm font-medium"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const ward = selectedWard;
                  setShowWardDetails(false);
                  setSelectedWard(null);
                  handleEditWard(ward);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                style={{ background: 'var(--icon-cyan-text)' }}
              >
                <Edit className="w-4 h-4" />
                Edit Ward
              </button>
            </>
          ) : null
        }
      >
        {selectedWard && (
          <div className="p-6 space-y-5">
            {/* Bed statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl border" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                <Bed className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--icon-cyan-text)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--icon-cyan-text)' }}>
                  {getWardBeds(getEntityId(selectedWard)!).length}
                </p>
                <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Total Beds</p>
              </div>
              <div className="text-center p-3 rounded-xl border" style={{ background: 'var(--icon-green-bg)', borderColor: 'var(--border-color)' }}>
                <UserCheck className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--icon-green-text)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--icon-green-text)' }}>
                  {getAvailableBedsCount(getEntityId(selectedWard)!)}
                </p>
                <p className="text-[11px] font-medium" style={{ color: 'var(--icon-green-text)' }}>Available</p>
              </div>
              <div className="text-center p-3 rounded-xl border" style={{ background: 'var(--icon-red-bg)', borderColor: 'var(--border-color)' }}>
                <UserX className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--icon-red-text)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--icon-red-text)' }}>
                  {getOccupiedBeds(getEntityId(selectedWard)!)}
                </p>
                <p className="text-[11px] font-medium" style={{ color: 'var(--icon-red-text)' }}>Occupied</p>
              </div>
            </div>

            {/* Basic info */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <Info className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Location', value: selectedWard.location || 'Not specified' },
                  { label: 'Floor', value: selectedWard.floor || 'Not specified' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg" style={{ background: 'var(--bg-main)' }}>
                    <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                  </div>
                ))}
                <div className="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-main)' }}>
                  <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Tariff Code</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedWard.tariffCode || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <DollarSign className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
                Pricing & Rates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Daily Cash Rate', value: formatCurrency(selectedWard.dailyCashRate), color: 'var(--icon-cyan-text)', bg: 'var(--icon-cyan-bg)' },
                  { label: 'Daily NHIS Rate', value: formatCurrency(selectedWard.dailyNHISRate), color: 'var(--icon-purple-text)', bg: 'var(--icon-purple-bg)' },
                  { label: 'Daily Insurance Rate', value: formatCurrency(selectedWard.dailyInsuranceRate), color: 'var(--icon-green-text)', bg: 'var(--icon-green-bg)' },
                  { label: 'VAT Rate', value: `${selectedWard.vatRate || 0}%`, color: 'var(--icon-orange-text)', bg: 'var(--icon-orange-bg)' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg border" style={{ background: item.bg, borderColor: 'var(--border-color)' }}>
                    <p className="text-[11px] font-medium mb-0.5" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coverage */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <Shield className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
                Insurance Coverage
              </h3>
              <div className="rounded-lg divide-y" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                {[
                  { label: 'NHIS Covered', value: selectedWard.isNHISCovered },
                  { label: 'NHIS Requires Authorization', value: selectedWard.nhisRequiresAuth },
                  { label: 'Private Insurance Exempted', value: selectedWard.isPrivateInsExempted },
                  { label: 'Requires Authorization', value: selectedWard.requiresAuthorization },
                  { label: 'Taxable', value: selectedWard.isTaxable },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5"
                    style={{ borderColor: 'var(--border-color)', borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}
                  >
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    {item.value ? (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--icon-green-text)' }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        <XCircle className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedWard.description && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  <FileText className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
                  Description
                </h3>
                <p className="text-sm p-3 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'var(--bg-main)' }}>
                  {selectedWard.description}
                </p>
              </div>
            )}

            {/* All beds */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <Bed className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
                All Beds ({getWardBeds(getEntityId(selectedWard)!).length})
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {getWardBeds(getEntityId(selectedWard)!).map((bed) => {
                  const occupied = Boolean(bed.isOccupied);
                  return (
                    <div
                      key={getEntityId(bed)}
                      className="p-2.5 rounded-lg text-center text-xs font-bold transition-all border"
                      style={
                        occupied
                          ? { background: 'var(--icon-red-bg)', color: 'var(--icon-red-text)', borderColor: 'var(--border-color)' }
                          : { background: 'var(--icon-green-bg)', color: 'var(--icon-green-text)', borderColor: 'var(--border-color)' }
                      }
                      title={occupied ? `Occupied by ${bed.currentPatient?.fullName || 'patient'}` : 'Available'}
                    >
                      {bed.bedNumber}
                    </div>
                  );
                })}
                {getWardBeds(getEntityId(selectedWard)!).length === 0 && (
                  <div className="col-span-full text-center text-xs py-4" style={{ color: 'var(--text-tertiary)' }}>
                    No beds configured for this ward
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ModalShell>

      {/* ═══════════ Ward Form Modal ═══════════ */}
      <ModalShell
        isOpen={showWardForm}
        onClose={() => { setShowWardForm(false); setEditingWard(null); resetWardForm(); }}
        title={editingWard ? 'Edit Ward' : 'Create New Ward'}
        Icon={
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--icon-cyan-bg)' }}>
            {editingWard
              ? <Edit className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
              : <Plus className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />}
          </div>
        }
      >
        <form onSubmit={handleWardSubmit} className="p-6 space-y-5">
          {/* Basic Information */}
          <fieldset className="border-b pb-5" style={{ borderColor: 'var(--border-color)' }}>
            <legend className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <Building className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
              Basic Information
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Ward Name</FieldLabel>
                <TextInput
                  value={wardFormData.wardName}
                  onChange={(v) => setWardFormData({ ...wardFormData, wardName: v })}
                  placeholder="Enter ward name"
                  required
                />
              </div>
              <div>
                <FieldLabel required>Ward Type</FieldLabel>
                <select
                  required
                  value={wardFormData.wardType}
                  onChange={(e) => setWardFormData({ ...wardFormData, wardType: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm"
                  style={inputStyle}
                >
                  {WARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel required>Total Beds</FieldLabel>
                <TextInput
                  type="number"
                  min={1}
                  value={wardFormData.totalBeds}
                  onChange={(v) => setWardFormData({ ...wardFormData, totalBeds: parseIntegerInput(v, 1) })}
                  required
                />
              </div>
              <div>
                <FieldLabel>Tariff Code</FieldLabel>
                <TextInput
                  value={wardFormData.tariffCode}
                  onChange={(v) => setWardFormData({ ...wardFormData, tariffCode: v })}
                  placeholder="Optional tariff code"
                />
              </div>
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="border-b pb-5" style={{ borderColor: 'var(--border-color)' }}>
            <legend className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <DollarSign className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
              Pricing
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel required>Daily Cash Rate</FieldLabel>
                <TextInput
                  type="number"
                  min={0}
                  step={0.01}
                  value={wardFormData.dailyCashRate}
                  onChange={(v) => setWardFormData({ ...wardFormData, dailyCashRate: parseNumericInput(v, 0) })}
                  required
                />
              </div>
              <div>
                <FieldLabel>Daily NHIS Rate</FieldLabel>
                <TextInput
                  type="number"
                  min={0}
                  step={0.01}
                  value={wardFormData.dailyNHISRate}
                  onChange={(v) => setWardFormData({ ...wardFormData, dailyNHISRate: parseNumericInput(v, 0) })}
                />
              </div>
              <div>
                <FieldLabel>Daily Insurance Rate</FieldLabel>
                <TextInput
                  type="number"
                  min={0}
                  step={0.01}
                  value={wardFormData.dailyInsuranceRate}
                  onChange={(v) => setWardFormData({ ...wardFormData, dailyInsuranceRate: parseNumericInput(v, 0) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <FieldLabel>VAT Rate (%)</FieldLabel>
                <TextInput
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={wardFormData.vatRate}
                  onChange={(v) => setWardFormData({ ...wardFormData, vatRate: parseNumericInput(v, 0) })}
                />
              </div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={wardFormData.isTaxable}
                    onChange={(e) => setWardFormData({ ...wardFormData, isTaxable: e.target.checked })}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--icon-cyan-text)' }}
                  />
                  Taxable
                </label>
              </div>
            </div>
          </fieldset>

          {/* Coverage */}
          <fieldset className="border-b pb-5" style={{ borderColor: 'var(--border-color)' }}>
            <legend className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <Shield className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
              Insurance Coverage
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'isNHISCovered', label: 'NHIS Covered' },
                { key: 'nhisRequiresAuth', label: 'NHIS Requires Authorization' },
                { key: 'isPrivateInsExempted', label: 'Private Insurance Exempted' },
                { key: 'requiresAuthorization', label: 'Requires Authorization' },
              ] as const).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 text-sm p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}
                >
                  <input
                    type="checkbox"
                    checked={wardFormData[item.key]}
                    onChange={(e) => setWardFormData({ ...wardFormData, [item.key]: e.target.checked })}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--icon-cyan-text)' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Location & Description */}
          <fieldset>
            <legend className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <MapPin className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
              Location & Description
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <FieldLabel>Location</FieldLabel>
                <TextInput
                  value={wardFormData.location}
                  onChange={(v) => setWardFormData({ ...wardFormData, location: v })}
                  placeholder="e.g., Main Building"
                />
              </div>
              <div>
                <FieldLabel>Floor</FieldLabel>
                <TextInput
                  value={wardFormData.floor}
                  onChange={(v) => setWardFormData({ ...wardFormData, floor: v })}
                  placeholder="e.g., 2nd Floor"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={wardFormData.description}
                onChange={(e) => setWardFormData({ ...wardFormData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 border rounded-lg text-sm resize-none"
                style={inputStyle}
                placeholder="Ward description"
              />
            </div>
          </fieldset>

          <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={() => { setShowWardForm(false); setEditingWard(null); resetWardForm(); }}
              className="px-4 py-2 border rounded-lg text-sm font-medium"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              {editingWard ? 'Update Ward' : 'Create Ward'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* ═══════════ Bed Form Modal ═══════════ */}
      <ModalShell
        isOpen={showBedForm}
        onClose={() => { setShowBedForm(false); setSelectedWard(null); resetBedForm(); }}
        title={`Add Bed${selectedWard ? ` to ${selectedWard.wardName}` : ''}`}
        maxWidth="max-w-md"
        Icon={
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--icon-cyan-bg)' }}>
            <Bed className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
          </div>
        }
      >
        <form onSubmit={handleBedSubmit} className="p-6 space-y-4">
          {!selectedWard && (
            <div>
              <FieldLabel required>Select Ward</FieldLabel>
              <select
                required
                value={bedFormData.wardId}
                onChange={(e) => setBedFormData({ ...bedFormData, wardId: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="">Choose a ward</option>
                {wards.map(ward => (
                  <option key={getEntityId(ward)} value={getEntityId(ward)}>
                    {ward.wardName} ({ward.wardType}) - {getWardBeds(getEntityId(ward)!).length} beds
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <FieldLabel required>Bed Number</FieldLabel>
            <TextInput
              value={bedFormData.bedNumber}
              onChange={(v) => setBedFormData({ ...bedFormData, bedNumber: v })}
              placeholder="e.g., A1, B2, ICU-01"
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={() => { setShowBedForm(false); setSelectedWard(null); resetBedForm(); }}
              className="px-4 py-2 border rounded-lg text-sm font-medium"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              Create Bed
            </button>
          </div>
        </form>
      </ModalShell>

      {/* ═══════════ Delete Confirmation Modals ═══════════ */}
      <ConfirmationModal
        isOpen={pendingDeleteWard !== null}
        onClose={() => setPendingDeleteWard(null)}
        onConfirm={confirmDeleteWard}
        title="Delete Ward"
        message={
          wardDeleteBedCount > 0
            ? `Ward "${pendingDeleteWard?.wardName}" has ${wardDeleteBedCount} bed(s). They will be deleted as well. This cannot be undone.`
            : `Are you sure you want to delete "${pendingDeleteWard?.wardName}"? This cannot be undone.`
        }
        confirmText="Delete Ward"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={pendingDeleteBed !== null}
        onClose={() => setPendingDeleteBed(null)}
        onConfirm={confirmDeleteBed}
        title="Delete Bed"
        message={`Are you sure you want to delete bed "${pendingDeleteBed?.bedNumber}"? This cannot be undone.`}
        confirmText="Delete Bed"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}