// src/components/BasicInfoForm.tsx
import { User, Calendar, Phone, MapPin, Camera, Upload, X } from 'lucide-react';

interface BasicInfoFormProps {
  formData: {
    surname: string;
    otherNames: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth: string;
    contact: string;
    address: string;
  };
  additionalInfo: {
    title?: string;
    email: string;
    houseNumber: string;
    idType?: string;
    idNumber: string;
    bloodType?: string;
    occupation: string;
    nextOfKin: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  ageDisplay: string;
  imagePreview: string;
  isUploadingImage: boolean;
  isEditMode: boolean;
  currentPatient: any;
  onFormDataChange: (data: any) => void;
  onAdditionalInfoChange: (info: any) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
  calculateAge: (
    dob: string
  ) => { years: number; months: number; display: string };
}

// ── shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-2.5 py-2 text-sm border border-[var(--border-color)] rounded-lg ' +
  'bg-[var(--bg-main)] text-[var(--text-primary)] ' +
  'placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] ' +
  'focus:border-[var(--icon-cyan-text)] transition-all';

const labelCls = 'block text-xs font-medium text-[var(--text-secondary)] mb-1';

export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  formData,
  additionalInfo,
  ageDisplay,
  imagePreview,
  isUploadingImage,
  isEditMode,
  currentPatient,
  onFormDataChange,
  onAdditionalInfoChange,
  onImageChange,
  removeImage,
  calculateAge,
}) => {
  const getFullName = () =>
    `${additionalInfo.title ? additionalInfo.title + ' ' : ''}${formData.surname} ${formData.otherNames}`.trim();

  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        display: 'grid',
        gridTemplateColumns: '148px 1fr',
        minHeight: 340,
      }}
    >
      {/* ── LEFT: avatar column ──────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-3 p-4 border-r"
        style={{
          background: 'var(--bg-main)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Avatar circle */}
        <div className="relative flex-shrink-0 mt-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2"
            style={{
              background: 'var(--bg-card)',
              borderColor: imagePreview
                ? 'var(--icon-cyan-text)'
                : 'var(--border-color)',
            }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Patient preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <User
                className="w-8 h-8"
                style={{ color: 'var(--text-tertiary)' }}
              />
            )}
          </div>

          {/* Remove button */}
          {imagePreview && (
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow transition-opacity hover:opacity-80"
              style={{ background: 'var(--icon-red-text)', border: '2px solid var(--bg-main)' }}
              title="Remove photo"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          )}

          {/* Camera badge */}
          {!imagePreview && (
            <label
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow transition-opacity hover:opacity-80"
              style={{ background: 'var(--icon-cyan-text)', border: '2px solid var(--bg-main)' }}
              title="Upload photo"
            >
              <Camera className="w-3 h-3 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
          )}
        </div>

        {/* Upload label / uploading state */}
        {isUploadingImage ? (
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--icon-cyan-text)', borderTopColor: 'transparent' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Uploading…
            </span>
          </div>
        ) : (
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLLabelElement).style.background =
                'var(--icon-cyan-bg)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLLabelElement).style.background =
                'var(--bg-card)')
            }
          >
            <Upload className="w-3 h-3" />
            {imagePreview ? 'Change' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="hidden"
              disabled={isUploadingImage}
            />
          </label>
        )}

        <p
          className="text-center leading-relaxed"
          style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
        >
          JPG, PNG or GIF
          <br />
          max 5 MB
        </p>

        {/* Name preview */}
        <div
          className="w-full mt-auto rounded-lg p-2 border"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p
            className="text-center mb-1"
            style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
          >
            Name preview
          </p>
          <p
            className="text-center font-medium leading-tight"
            style={{
              fontSize: 12,
              color: getFullName()
                ? 'var(--text-primary)'
                : 'var(--text-tertiary)',
            }}
          >
            {getFullName() || 'Enter name →'}
          </p>
        </div>
      </div>

      {/* ── RIGHT: form fields ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-4">

        {/* Row 1: Title · Surname · Other names */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 10 }}
        >
          <div>
            <label className={labelCls}>Title</label>
            <select
              value={additionalInfo.title || ''}
              onChange={(e) =>
                onAdditionalInfoChange({ ...additionalInfo, title: e.target.value })
              }
              className={inputCls}
            >
              <option value="">—</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
              <option value="Rev">Rev</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Surname{' '}
              <span style={{ color: 'var(--icon-red-text)', fontSize: 10 }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.surname}
              onChange={(e) =>
                onFormDataChange({ ...formData, surname: e.target.value })
              }
              placeholder="Surname"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Other names{' '}
              <span style={{ color: 'var(--icon-red-text)', fontSize: 10 }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.otherNames}
              onChange={(e) =>
                onFormDataChange({ ...formData, otherNames: e.target.value })
              }
              placeholder="Other names"
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 2: Gender · Date of birth */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className={labelCls}>
              Gender{' '}
              <span style={{ color: 'var(--icon-red-text)', fontSize: 10 }}>*</span>
            </label>
            <select
              required
              value={formData.gender}
              onChange={(e) =>
                onFormDataChange({ ...formData, gender: e.target.value as any })
              }
              className={inputCls}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Date of birth{' '}
              <span style={{ color: 'var(--icon-red-text)', fontSize: 10 }}>*</span>
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) =>
                  onFormDataChange({ ...formData, dateOfBirth: e.target.value })
                }
                className={inputCls}
                style={{ paddingLeft: '1.75rem' }}
              />
            </div>

            {/* Age display */}
            {formData.dateOfBirth && age && (
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: 'var(--icon-green-text)' }}
              >
                Age: {age.display}
                {isEditMode &&
                  currentPatient?.ageDisplay &&
                  age.display !== currentPatient.ageDisplay &&
                  ` (was: ${currentPatient.ageDisplay})`}
              </p>
            )}
            {!formData.dateOfBirth && isEditMode && currentPatient?.ageDisplay && (
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--icon-yellow-text)' }}
              >
                Stored age: {currentPatient.ageDisplay}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Contact · Address */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className={labelCls}>
              Contact number{' '}
              <span style={{ color: 'var(--icon-red-text)', fontSize: 10 }}>*</span>
            </label>
            <div className="relative">
              <Phone
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="tel"
                required
                value={formData.contact}
                onChange={(e) =>
                  onFormDataChange({ ...formData, contact: e.target.value })
                }
                placeholder="e.g. 0244 123 456"
                className={inputCls}
                style={{ paddingLeft: '1.75rem' }}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Address{' '}
              <span style={{ color: 'var(--icon-red-text)', fontSize: 10 }}>*</span>
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  onFormDataChange({ ...formData, address: e.target.value })
                }
                placeholder="Residential address"
                className={inputCls}
                style={{ paddingLeft: '1.75rem' }}
              />
            </div>
          </div>
        </div>

        {/* Required fields note */}
        <p
          className="mt-auto"
          style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
        >
          Fields marked{' '}
          <span style={{ color: 'var(--icon-red-text)' }}>*</span>{' '}
          are required.
        </p>
      </div>
    </div>
  );
};