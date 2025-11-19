import { User, Calendar, Phone, MapPin, Folder, Camera } from 'lucide-react';

interface BasicInfoFormProps {
  formData: {
    folderNumber: string;
    surname: string; // ✅ CHANGED: surname instead of fullName
    otherNames: string; // ✅ ADDED: otherNames field
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
  
  // ✅ ADDED: Helper to get full name for display
  const getFullName = () => {
    return `${formData.surname} ${formData.otherNames}`.trim();
  };

  return (
    <div className="space-y-4">
      {/* Patient Photo */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          Patient Photo
        </h2>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
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
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Photo {isUploadingImage && '(Uploading...)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              disabled={isUploadingImage}
            />
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG or GIF (max. 5MB). Image will be automatically compressed.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information with SURNAME + OTHERNAMES */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Basic Information</h2>
        
        {/* Name Preview */}
        {formData.surname && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Name Preview:</strong> {getFullName()}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <select
              value={additionalInfo.title || ''}
              onChange={(e) => onAdditionalInfoChange({
                ...additionalInfo,
                title: e.target.value as 'Mr' | 'Mrs' | 'Miss' | 'Dr' | 'Prof' | 'Rev' | 'Other'
              })}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
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

          {/* Folder Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folder Number
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.folderNumber}
                onChange={(e) => onFormDataChange({ ...formData, folderNumber: e.target.value })}
                className="w-full pl-9 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                placeholder="Folder number"
              />
            </div>
          </div>

          {/* ✅ CHANGED: Surname field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Surname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.surname}
              onChange={(e) => onFormDataChange({ ...formData, surname: e.target.value })}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              placeholder="Enter surname"
            />
          </div>

          {/* ✅ ADDED: Other Names field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Names <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.otherNames}
              onChange={(e) => onFormDataChange({ ...formData, otherNames: e.target.value })}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              placeholder="Enter other names"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.gender}
              onChange={(e) => onFormDataChange({ ...formData, gender: e.target.value as any })}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => onFormDataChange({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
            {formData.dateOfBirth && (
              <p className="text-xs text-gray-600 mt-1">
                Age: {calculateAge(formData.dateOfBirth).display}
                {isEditMode && currentPatient?.ageDisplay && 
                  calculateAge(formData.dateOfBirth).display !== currentPatient.ageDisplay && 
                  ` (was: ${currentPatient.ageDisplay})`
                }
              </p>
            )}
            {!formData.dateOfBirth && isEditMode && currentPatient?.ageDisplay && (
              <p className="text-xs text-yellow-600 mt-1">
                Stored age: {currentPatient.ageDisplay}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                required
                value={formData.contact}
                onChange={(e) => onFormDataChange({ ...formData, contact: e.target.value })}
                className="w-full pl-9 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
                placeholder="Full residential address"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};