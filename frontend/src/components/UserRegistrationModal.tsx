// src/components/UserRegistrationModal.tsx
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { X, Save, User, Mail, Phone, IdCard, Stethoscope, Shield } from 'lucide-react';

interface UserRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserRegistrationModal({ onClose, onSuccess }: UserRegistrationModalProps) {
  const { register, isLoading } = useAuthStore();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: '' as any,
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
  });

  const medicalRoles = ['doctor', 'nurse', 'midwife'];
  const requiresLicense = medicalRoles.includes(formData.role);
  const requiresSpecialization = formData.role === 'doctor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      error('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      error('Invalid Password', 'Password must be at least 6 characters long');
      return;
    }

    if (requiresLicense && !formData.licenseNumber) {
      error('License Required', 'License number is required for medical staff');
      return;
    }

    if (requiresSpecialization && !formData.specialization) {
      error('Specialization Required', 'Specialization is required for doctors');
      return;
    }

    try {
      await register({
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        licenseNumber: requiresLicense ? formData.licenseNumber : undefined,
        specialization: requiresSpecialization ? formData.specialization : undefined,
      });
      
      success('User Registered', `${formData.fullName} has been registered successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Registration Failed', err.response?.data?.message || 'Failed to register user');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Register New User</h2>
            <p className="text-[var(--text-secondary)] text-sm">Add a new staff member to the system</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                required
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="midwife">Midwife</option>
                <option value="records">Records Officer</option>
                <option value="lab_tech">Lab Technician</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="accounts">Accounts</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              />
            </div>
          </div>

          {/* Professional Information */}
          {requiresLicense && (
            <div className="bg-[var(--icon-cyan-bg)] rounded-lg p-4 border border-[var(--icon-cyan-text)] space-y-4">
              <h3 className="font-semibold text-[var(--icon-cyan-text)] text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Professional Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  <IdCard className="w-4 h-4 inline mr-2" />
                  License/PIN Number *
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="Enter professional license number"
                  className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  required={requiresLicense}
                />
              </div>

              {requiresSpecialization && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Stethoscope className="w-4 h-4 inline mr-2" />
                    Specialization *
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g., Pediatrics, Surgery, etc."
                    className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                    required={requiresSpecialization}
                  />
                </div>
              )}
            </div>
          )}

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                required
                minLength={6}
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Registering...' : 'Register User'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}