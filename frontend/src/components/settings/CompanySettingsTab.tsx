// src/components/settings/CompanySettingsTab.tsx - UPDATED (NHIS REMOVED)
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { 
  Save, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Upload, 
  Globe
} from 'lucide-react';

export default function CompanySettingsTab() {
  const { hospital, getHospitalDetails, updateHospitalDetails, isLoading } = useSettingsStore();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    type: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    
    // Additional Details
    description: '',
    emergencyPhone: '',
    
    // Media
    imageUrl: '',
    logoUrl: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    loadHospitalDetails();
  }, []);

  const loadHospitalDetails = async () => {
    try {
      await getHospitalDetails();
    } catch (err) {
      error('Load Failed', 'Failed to load hospital details');
    }
  };

  useEffect(() => {
    if (hospital) {
      setFormData({
        // Basic Information
        name: hospital.name || '',
        type: hospital.type || '',
        address: hospital.address || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
        website: hospital.website || '',
        
        // Additional Details
        description: hospital.description || '',
        emergencyPhone: hospital.emergencyPhone || '',
        
        // Media
        imageUrl: hospital.imageUrl || '',
        logoUrl: hospital.logoUrl || ''
      });
      setImagePreview(hospital.imageUrl || hospital.logoUrl || '');
    }
  }, [hospital]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        error('File Too Large', 'Image must be smaller than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        error('Invalid File', 'Please select an image file');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name.trim()) {
        error('Validation Error', 'Hospital name is required');
        return;
      }

      if (!formData.address.trim()) {
        error('Validation Error', 'Hospital address is required');
        return;
      }

      if (!formData.phone.trim()) {
        error('Validation Error', 'Phone number is required');
        return;
      }

      if (!formData.email.trim()) {
        error('Validation Error', 'Email address is required');
        return;
      }

      const submitData = {
        ...formData,
        imageUrl: imagePreview || formData.imageUrl
      };

      await updateHospitalDetails(submitData);
      success('Hospital Details Updated', 'Hospital details updated successfully!');
    } catch (err: any) {
      error('Update Failed', err.response?.data?.message || 'Failed to update hospital details');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const hospitalTypes = [
    'General Hospital',
    'Teaching Hospital',
    'District Hospital',
    'Regional Hospital',
    'Specialist Hospital',
    'Clinic',
    'Health Center',
    'Polyclinic',
    'Maternity Home',
    'Diagnostic Center'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">Hospital Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hospital Logo/Image */}
          <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Hospital Logo
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-24 h-24 bg-[var(--bg-card)] rounded-lg border-2 border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Hospital logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-8 h-8 text-[var(--text-tertiary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Upload Logo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[var(--icon-cyan-bg)] file:text-[var(--icon-cyan-text)] hover:file:bg-[var(--icon-cyan-text)] hover:file:text-white"
                  />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG or GIF (max. 5MB)</p>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
            <h3 className="text-md font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  required
                  placeholder="Enter hospital name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Hospital Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                >
                  <option value="">Select hospital type</option>
                  {hospitalTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  required
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  required
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  placeholder="Enter emergency phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  placeholder="https://example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  required
                  placeholder="Enter hospital address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  placeholder="Enter hospital description"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}