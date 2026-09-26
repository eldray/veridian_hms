// src/pages/UserDetail.tsx - Admin editing a single user
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import {
  ChevronLeft, Save, User as UserIcon, Briefcase, DollarSign,
  FileText, Play, Check, Clock, Plus, X, Trash2,
} from 'lucide-react';
import PayslipEditor from '../components/PayslipEditor';

const formatCedis = (v: number | string | undefined | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₵${(isNaN(n) ? 0 : n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ─────────────────────────────────────────────
// DocumentsTab — defined OUTSIDE the parent component
// ─────────────────────────────────────────────
const DocumentsTab: React.FC<{ userId: string }> = ({ userId }) => {
  const {
    getUserDocuments, uploadDocument, verifyDocument,
    unverifyDocument, deleteDocument,
  } = useUserStore();
  const { success, error } = useToast();

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('LICENSE');
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await getUserDocuments(userId);
      setDocs(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { error('No file', 'Pick a file to upload'); return; }
    if (!title.trim()) { error('Title required', 'Give the document a title'); return; }

    setUploading(true);
    try {
      await uploadDocument(userId, {
        file,
        type,
        title: title.trim(),
        expiryDate: expiryDate || undefined,
      });
      success('Uploaded', 'Document added');
      setShowUpload(false);
      setFile(null);
      setTitle('');
      setExpiryDate('');
      setType('LICENSE');
      await load();
    } catch (err: any) {
      error('Upload failed', err?.response?.data?.message || 'Could not upload');
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (documentId: string) => {
    try {
      await verifyDocument(documentId);
      success('Verified', 'Document marked verified');
      await load();
    } catch (err: any) {
      error('Failed', err?.response?.data?.message || 'Could not verify');
    }
  };

  const handleUnverify = async (documentId: string) => {
    try {
      await unverifyDocument(documentId);
      success('Unverified', 'Verification removed');
      await load();
    } catch (err: any) {
      error('Failed', err?.response?.data?.message || 'Could not unverify');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await deleteDocument(documentId);
      success('Deleted', 'Document removed');
      await load();
    } catch (err: any) {
      error('Failed', err?.response?.data?.message || 'Could not delete');
    }
  };

  const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString() : '—');

  const daysUntilExpiry = (d: any): number | null => {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const expiryBadge = (d: any) => {
    const days = daysUntilExpiry(d);
    if (days === null) return null;
    if (days < 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">EXPIRED</span>;
    if (days < 30) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">Expires in {days}d</span>;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Staff licenses, certificates, IDs, and degrees.
        </p>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
          <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">No documents on file.</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Click <strong>Upload Document</strong> above to add one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-[var(--text-primary)] truncate">{doc.title}</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                    {doc.type.replace(/_/g, ' ')}
                  </span>
                  {expiryBadge(doc.expiryDate)}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {doc.expiryDate ? `Expires: ${fmtDate(doc.expiryDate)}` : 'No expiry'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {doc.isVerified ? 'Verified' : 'Pending'}
                </span>

                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--icon-cyan-text)] hover:underline font-medium"
                  >
                    View
                  </a>
                )}

                {!doc.isVerified ? (
                  <button onClick={() => handleVerify(doc.id)} className="text-xs text-green-600 hover:underline font-medium">
                    Verify
                  </button>
                ) : (
                  <button onClick={() => handleUnverify(doc.id)} className="text-xs text-[var(--text-secondary)] hover:underline">
                    Unverify
                  </button>
                )}

                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1 text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)]">
            <div className="bg-[var(--bg-main)] px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded hover:bg-[var(--bg-card)]">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                >
                  <option value="LICENSE">License</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="ID_CARD">ID Card</option>
                  <option value="DEGREE">Degree</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Medical License 2026"
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">File *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                  required
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">PDF, JPG, PNG, DOC, DOCX · Max 10 MB</p>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main UserDetail
// ─────────────────────────────────────────────
export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    getFullProfile, updateFullProfile, currentFullProfile, isLoading,
    getUserPayslips, generatePayslip,
  } = useUserStore();

  const [tab, setTab] = useState<'profile' | 'hr' | 'payslips' | 'documents'>('profile');
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());

  const [userForm, setUserForm] = useState({
    fullName: '', email: '', phone: '',
    role: '', seniority: 'JUNIOR',
    licenseNumber: '', specialization: '',
    isActive: true,
  });

  const [hrForm, setHrForm] = useState({
    employeeId: '',
    employmentType: 'PERMANENT',
    dateJoined: '',
    bio: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
  });

  const [payslips, setPayslips] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingPayslipId, setEditingPayslipId] = useState<string | null>(null);

  useEffect(() => {
    if (id) getFullProfile(id);
  }, [id]);

  useEffect(() => {
    if (currentFullProfile) {
      setUserForm({
        fullName: currentFullProfile.fullName || '',
        email: currentFullProfile.email || '',
        phone: currentFullProfile.phone || '',
        role: currentFullProfile.role || '',
        seniority: currentFullProfile.seniority || 'JUNIOR',
        licenseNumber: currentFullProfile.licenseNumber || '',
        specialization: currentFullProfile.specialization || '',
        isActive: currentFullProfile.isActive ?? true,
      });
      const sp = currentFullProfile.staffProfile;
      setHrForm({
        employeeId: sp?.employeeId || '',
        employmentType: sp?.employmentType || 'PERMANENT',
        dateJoined: sp?.dateJoined ? sp.dateJoined.split('T')[0] : '',
        bio: sp?.bio || '',
        nextOfKinName: sp?.nextOfKinName || '',
        nextOfKinPhone: sp?.nextOfKinPhone || '',
      });
      setPayslips(sp?.payrollRecords || []);
    }
  }, [currentFullProfile]);

  useEffect(() => {
    if (id && tab === 'payslips') {
      getUserPayslips(id).then(setPayslips).catch(() => {});
    }
  }, [tab, id]);

  const saveUserTab = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateFullProfile(id, { user: userForm });
      success('Saved', 'User details updated');
    } catch (err: any) {
      toastError('Save failed', err?.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const saveHrTab = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateFullProfile(id, { hr: hrForm });
      success('Saved', 'HR details updated');
    } catch (err: any) {
      toastError('Save failed', err?.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const handleGenerateOne = async () => {
    if (!id) return;
    try {
      await generatePayslip(id, payrollMonth, payrollYear);
      const fresh = await getUserPayslips(id);
      setPayslips(fresh);
      success('Payslip generated', `${payrollMonth}/${payrollYear}`);
    } catch (err: any) {
      toastError('Failed', err?.response?.data?.message || 'Could not generate');
    }
  };

  const refreshPayslips = async () => {
    if (!id) return;
    try {
      const fresh = await getUserPayslips(id);
      setPayslips(fresh);
    } catch { /* ignore */ }
  };

  if (isLoading && !currentFullProfile) {
    return <div className="p-8 text-center">Loading…</div>;
  }
  if (!currentFullProfile) {
    return <div className="p-8 text-center text-red-600">User not found</div>;
  }

  const p = currentFullProfile;
  const sp = p.staffProfile;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/users')} className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)]">
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{p.fullName}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              @{p.username} · {p.role.replace(/_/g, ' ')} {sp && `· ${sp.employeeId}`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 max-w-lg">
        {[
          { id: 'profile',   label: 'Profile',    icon: UserIcon },
          { id: 'hr',        label: 'HR Details', icon: Briefcase },
          { id: 'payslips',  label: 'Payslips',   icon: DollarSign },
          { id: 'documents', label: 'Documents',  icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.id
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6">
        {tab === 'profile' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Full Name *</label>
                <input type="text" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Username (read-only)</label>
                <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)] font-mono">{p.username}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Phone</label>
                <input type="tel" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Role</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                  <option value="admin">Admin</option>
                  <option value="hr_officer">HR Officer</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="midwife">Midwife</option>
                  <option value="records">Records</option>
                  <option value="lab_tech">Lab Tech</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="accounts">Accounts</option>
                  <option value="sonographer">Sonographer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Seniority</label>
                <select value={userForm.seniority} onChange={(e) => setUserForm({ ...userForm, seniority: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                  <option value="TRAINEE">Trainee</option>
                  <option value="JUNIOR">Junior</option>
                  <option value="SENIOR">Senior</option>
                  <option value="PRINCIPAL">Principal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">License Number</label>
                <input type="text" value={userForm.licenseNumber} onChange={(e) => setUserForm({ ...userForm, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Specialization</label>
                <input type="text" value={userForm.specialization} onChange={(e) => setUserForm({ ...userForm, specialization: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={userForm.isActive} onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                    className="rounded border-[var(--border-color)]" />
                  <span className="text-sm text-[var(--text-primary)]">Account is active</span>
                </label>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-color)]">
              <button onClick={saveUserTab} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {tab === 'hr' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Employee ID</label>
                <input type="text" value={hrForm.employeeId} onChange={(e) => setHrForm({ ...hrForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Employment Type</label>
                <select value={hrForm.employmentType} onChange={(e) => setHrForm({ ...hrForm, employmentType: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                  <option value="PERMANENT">Permanent</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="LOCUM">Locum</option>
                  <option value="INTERN">Intern</option>
                  <option value="NATIONAL_SERVICE">National Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Date Joined</label>
                <input type="date" value={hrForm.dateJoined} onChange={(e) => setHrForm({ ...hrForm, dateJoined: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Job Grade</label>
                <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]">
                  {sp?.jobGrade ? `${sp.jobGrade.name} (${sp.jobGrade.code})` : '— not assigned —'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Salary Step</label>
                <div className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]">
                  {sp?.salaryStep ? `Step ${sp.salaryStep.stepNumber} — ${formatCedis(sp.salaryStep.amount)}` : '— not assigned —'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Next of Kin</label>
                <input type="text" value={hrForm.nextOfKinName} onChange={(e) => setHrForm({ ...hrForm, nextOfKinName: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Next of Kin Phone</label>
                <input type="tel" value={hrForm.nextOfKinPhone} onChange={(e) => setHrForm({ ...hrForm, nextOfKinPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Bio / Notes</label>
                <textarea rows={3} value={hrForm.bio} onChange={(e) => setHrForm({ ...hrForm, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] resize-none" />
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-color)]">
              <button onClick={saveHrTab} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save HR Details'}
              </button>
            </div>
          </div>
        )}

        {tab === 'payslips' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Month</label>
                <select value={payrollMonth} onChange={(e) => setPayrollMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Year</label>
                <select value={payrollYear} onChange={(e) => setPayrollYear(Number(e.target.value))}
                  className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]">
                  {[0, 1, 2].map((i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
                </select>
              </div>
              <button onClick={handleGenerateOne}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium">
                <Play className="w-4 h-4" /> Generate for {payrollMonth}/{payrollYear}
              </button>
            </div>

            {payslips.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No payslips yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Month</th>
                      <th className="px-4 py-2 text-right font-semibold text-[var(--text-secondary)]">Base</th>
                      <th className="px-4 py-2 text-right font-semibold text-[var(--text-secondary)]">Allowances</th>
                      <th className="px-4 py-2 text-right font-semibold text-[var(--text-secondary)]">Deductions</th>
                      <th className="px-4 py-2 text-right font-semibold text-[var(--text-secondary)]">Net</th>
                      <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Status</th>
                      <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {payslips.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-medium">{String(r.month).padStart(2, '0')}/{r.year}</td>
                        <td className="px-4 py-2 text-right">{formatCedis(r.baseSalary)}</td>
                        <td className="px-4 py-2 text-right">{formatCedis(r.allowances)}</td>
                        <td className="px-4 py-2 text-right">{formatCedis(r.deductions)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCedis(r.netPay)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {r.isPaid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {r.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => setEditingPayslipId(r.id)}
                            className="text-xs text-[var(--icon-cyan-text)] hover:underline font-medium"
                          >
                            Edit Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'documents' && id && <DocumentsTab userId={id} />}
      </div>

      {editingPayslipId && (
        <PayslipEditor
          payslipId={editingPayslipId}
          onClose={() => setEditingPayslipId(null)}
          onSaved={refreshPayslips}
        />
      )}
    </div>
  );
}