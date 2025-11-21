import { User, Calendar, Phone, MapPin, Camera } from 'lucide-react';

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
  calculateAge: (dob: string) => { years: number; months: number; display: string };
}

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
  calculateAge
}) => {
  
  const getFullName = () => {
    return `${formData.surname} ${formData.otherNames}`.trim();
  };

  return (
    <div className="space-y-4">
      {/* Patient Photo - Compact */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Camera className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          Patient Photo
        </h2>
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Patient preview"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.error('Image failed to load:', imagePreview);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <User className="w-5 h-5 text-[var(--text-tertiary)]" />
              )}
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1 -right-1 bg-[var(--icon-red-text)] text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors text-xs"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Upload Photo {isUploadingImage && '(Uploading...)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="w-full px-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-xs"
              disabled={isUploadingImage}
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              JPG, PNG or GIF (max. 5MB)
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information - Compact Grid */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Basic Information</h2>
        
        {/* Name Preview - Compact */}
        {formData.surname && (
          <div className="mb-3 p-2 bg-[var(--icon-cyan-bg)] border border-[var(--icon-cyan-text)]/20 rounded text-xs">
            <p className="text-[var(--icon-cyan-text)] font-medium">
              <span className="text-[var(--text-secondary)]">Name Preview:</span> {getFullName()}
            </p>
          </div>
        )}
        
        {/* Compact 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Title
            </label>
            <select
              value={additionalInfo.title || ''}
              onChange={(e) => onAdditionalInfoChange({
                ...additionalInfo,
                title: e.target.value as 'Mr' | 'Mrs' | 'Miss' | 'Dr' | 'Prof' | 'Rev' | 'Other'
              })}
              className="w-full px-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
            >
              <option value="">Select Title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
              <option value="Rev">Rev</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Surname field */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Surname <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.surname}
              onChange={(e) => onFormDataChange({ ...formData, surname: e.target.value })}
              className="w-full px-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
              placeholder="Enter surname"
            />
          </div>

          {/* Other Names field */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Other Names <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.otherNames}
              onChange={(e) => onFormDataChange({ ...formData, otherNames: e.target.value })}
              className="w-full px-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
              placeholder="Enter other names"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Gender <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <select
              required
              value={formData.gender}
              onChange={(e) => onFormDataChange({ ...formData, gender: e.target.value as any })}
              className="w-full px-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Date of Birth <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)]" />
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => onFormDataChange({ ...formData, dateOfBirth: e.target.value })}
                className="w-full pl-7 pr-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
              />
            </div>
            {formData.dateOfBirth && (
              <p className="text-xs text-[var(--icon-green-text)] mt-1 font-medium">
                Age: {calculateAge(formData.dateOfBirth).display}
                {isEditMode && currentPatient?.ageDisplay && 
                  calculateAge(formData.dateOfBirth).display !== currentPatient.ageDisplay && 
                  ` (was: ${currentPatient.ageDisplay})`
                }
              </p>
            )}
            {!formData.dateOfBirth && isEditMode && currentPatient?.ageDisplay && (
              <p className="text-xs text-[var(--icon-yellow-text)] mt-1">
                Stored age: {currentPatient.ageDisplay}
              </p>
            )}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Contact Number <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)]" />
              <input
                type="tel"
                required
                value={formData.contact}
                onChange={(e) => onFormDataChange({ ...formData, contact: e.target.value })}
                className="w-full pl-7 pr-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Address - Full width */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Address <span className="text-[var(--icon-red-text)]">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)]" />
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
                className="w-full pl-7 pr-2 py-1.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
                placeholder="Full residential address"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};