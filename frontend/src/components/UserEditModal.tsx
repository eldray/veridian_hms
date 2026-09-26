// src/components/UserEditModal.tsx
// "Dumb" modal — collects data and calls `onSave`. Parent handles the API call.
import { useState, useEffect } from 'react';
import { useToast } from '../store/toastStore';
import { X, Save, User, Mail, Phone, IdCard, Stethoscope, Shield, TrendingUp, GraduationCap } from 'lucide-react';
import type { User as AppUser, Seniority } from '../types';

const SENIORITY_OPTIONS: { value: Seniority; label: string; icon: any; description: string }[] = [
  { value: 'TRAINEE',   label: 'Trainee',   icon: GraduationCap, description: 'In training, requires supervision' },
  { value: 'JUNIOR',    label: 'Junior',    icon: User,          description: 'Regular staff member' },
  { value: 'SENIOR',    label: 'Senior',    icon: TrendingUp,    description: 'Experienced, can supervise others' },
  { value: 'PRINCIPAL', label: 'Principal', icon: Shield,        description: 'Highest authority in role' },
];

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specialization: string;
  role: string;
  seniority: Seniority;
  isActive: boolean;
}

interface UserEditModalProps {
  user: AppUser;
  onClose: () => void;
  onSave: (data: Partial<AppUser>) => Promise<void> | void;
  isLoading?: boolean;
}

export default function UserEditModal({ user, onClose, onSave, isLoading }: UserEditModalProps) {
  const { error } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    role: '',
    seniority: 'JUNIOR',
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        licenseNumber: user.licenseNumber || '',
        specialization: user.specialization || '',
        role: user.role,
        seniority: (user.seniority as Seniority) || 'JUNIOR',
        isActive: user.isActive ?? true,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Strip medical-only fields if role no longer requires them
      const medicalRoles = ['doctor', 'nurse', 'midwife'];
      const requiresLicense = medicalRoles.includes(formData.role);
      const requiresSpecialization = formData.role === 'doctor';

      const payload: Partial<AppUser> = {
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        role: formData.role,
        seniority: formData.seniority,
        isActive: formData.isActive,
        licenseNumber: requiresLicense ? formData.licenseNumber : undefined,
        specialization: requiresSpecialization ? formData.specialization : undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      error('Update Failed', err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const medicalRoles = ['doctor', 'nurse', 'midwife'];
  const requiresLicense = medicalRoles.includes(formData.role);
  const requiresSpecialization = formData.role === 'doctor';
  const busy = saving || !!isLoading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Edit User</h3>
            <button
              onClick={onClose}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <User className="w-4 h-4 inline mr-2 text-blue-600" />
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <Shield className="w-4 h-4 inline mr-2 text-purple-600" />
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
                required
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="hr_officer">HR Officer</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="midwife">Midwife</option>
                <option value="records">Records Officer</option>
                <option value="lab_tech">Lab Technician</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="accounts">Accounts</option>
                <option value="sonographer">Sonographer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <TrendingUp className="w-4 h-4 inline mr-2 text-amber-600" />
                Seniority Level *
              </label>
              <select
                name="seniority"
                value={formData.seniority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
                required
              >
                {SENIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <Mail className="w-4 h-4 inline mr-2 text-green-600" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <Phone className="w-4 h-4 inline mr-2 text-orange-600" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
              />
            </div>

            {requiresLicense && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  <IdCard className="w-4 h-4 inline mr-2 text-yellow-600" />
                  License/PIN Number *
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
                  required={requiresLicense}
                />
              </div>
            )}

            {requiresSpecialization && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  <Stethoscope className="w-4 h-4 inline mr-2 text-red-600" />
                  Specialization *
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-[var(--bg-main)] text-[var(--text-primary)]"
                  required={requiresSpecialization}
                  placeholder="e.g., Pediatrics, Surgery, etc."
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-[var(--text-primary)]">User is active</span>
              </label>
              <p className="text-xs text-[var(--text-secondary)] mt-1 ml-6">
                Inactive users cannot log in to the system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50 font-medium text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{busy ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}