// src/components/settings/CompanySettingsTab.tsx - PROFESSIONAL REDESIGN
// Logic untouched: every field, validation, image upload, FormData submit and
// store call is exactly as before. Only layout changed:
//  - Sections are bg-card (not bg-main) with p-4, same as every other page —
//    bg-main sections inside a bg-card tab looked inset and washed out.
//  - Denser: space-y-4, p-4, logo 20x20 not 24x24, tighter headings.
//  - Inputs use the shared INPUT pattern (bg-main inputs were inconsistent).
//  - No code removed.
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { Save, Building, MapPin, Phone, Mail, Globe, Loader, AlertCircle } from 'lucide-react';

export default function CompanySettingsTab() {
  const { hospital, getHospitalDetails, updateHospitalDetails, isLoading, error, clearError } = useSettingsStore();
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({ name: '', type: '', address: '', phone: '', email: '', website: '', description: '', emergencyPhone: '', imageUrl: '', logoUrl: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => { loadHospitalDetails(); }, []);
  useEffect(() => { return () => { if (error) clearError(); }; }, [error, clearError]);

  const loadHospitalDetails = async () => {
    try { await getHospitalDetails(); } catch (err) { toastError('Load Failed', 'Failed to load hospital details'); }
  };

  useEffect(() => {
    if (hospital) {
      setFormData({ name: hospital.name || '', type: hospital.type || '', address: hospital.address || '', phone: hospital.phone || '', email: hospital.email || '', website: hospital.website || '', description: hospital.description || '', emergencyPhone: hospital.emergencyPhone || '', imageUrl: hospital.imageUrl || '', logoUrl: hospital.logoUrl || '' });
      setImagePreview(hospital.imageUrl || hospital.logoUrl || '');
    }
  }, [hospital]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toastError('File Too Large', 'Image must be smaller than 5MB'); return; }
      if (!file.type.startsWith('image/')) { toastError('Invalid File', 'Please select an image file'); return; }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name.trim()) { toastError('Validation Error', 'Hospital name is required'); return; }
      if (!formData.address.trim()) { toastError('Validation Error', 'Hospital address is required'); return; }
      if (!formData.phone.trim()) { toastError('Validation Error', 'Phone number is required'); return; }
      if (!formData.email.trim()) { toastError('Validation Error', 'Email address is required'); return; }
      const form = new FormData();
      form.append('name', formData.name.trim());
      form.append('address', formData.address.trim());
      form.append('phone', formData.phone.trim());
      form.append('email', formData.email.trim());
      if (formData.imageUrl && !formData.imageUrl.startsWith('data:')) { form.append('imageUrl', formData.imageUrl); }
      if (imageFile) form.append('image', imageFile);
      const saved = await updateHospitalDetails(form);
      setImageFile(null);
      setImagePreview(saved?.imageUrl || '');
      setFormData(prev => ({ ...prev, imageUrl: saved?.imageUrl || '' }));
      success('Hospital Details Updated', 'Hospital details updated successfully!');
    } catch (err: any) {
      toastError('Update Failed', err.response?.data?.message || 'Failed to update hospital details');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const hospitalTypes = ['General Hospital', 'Teaching Hospital', 'District Hospital', 'Regional Hospital', 'Specialist Hospital', 'Clinic', 'Health Center', 'Polyclinic', 'Maternity Home', 'Diagnostic Center'];
  const inputCls = "w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] focus:outline-none text-sm";
  const labelCls = "block text-sm font-medium text-[var(--text-primary)] mb-1";

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3"><div className="flex items-center gap-2 text-red-800 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="font-medium">Error:</span><span>{error}</span></div></div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo — compact row, not a big stacked block */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Building className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Hospital Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-[var(--bg-main)] rounded-xl border-2 border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
              {imagePreview ? <img src={imagePreview} alt="Hospital logo preview" className="w-full h-full object-cover" /> : <Building className="w-8 h-8 text-[var(--text-tertiary)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--icon-cyan-bg)] file:text-[var(--icon-cyan-text)] hover:file:bg-[var(--icon-cyan-text)] hover:file:text-white" />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG or GIF (max. 5MB)</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Building className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className={labelCls}>Hospital Name *</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputCls} required placeholder="Enter hospital name" /></div>
            <div><label className={labelCls}>Hospital Type</label><select name="type" value={formData.type} onChange={handleChange} className={inputCls}><option value="">Select hospital type</option>{hospitalTypes.map(type => (<option key={type} value={type}>{type}</option>))}</select></div>
            <div><label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-[var(--text-secondary)]" /> Phone Number *</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputCls} required placeholder="Enter phone number" /></div>
            <div><label className={labelCls}><Mail className="w-3.5 h-3.5 inline mr-1 text-[var(--text-secondary)]" /> Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputCls} required placeholder="Enter email address" /></div>
            <div><label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-[var(--text-secondary)]" /> Emergency Phone</label><input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} className={inputCls} placeholder="Enter emergency phone" /></div>
            <div><label className={labelCls}><Globe className="w-3.5 h-3.5 inline mr-1 text-[var(--text-secondary)]" /> Website</label><input type="url" name="website" value={formData.website} onChange={handleChange} className={inputCls} placeholder="https://example.com" /></div>
            <div className="md:col-span-2"><label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-[var(--text-secondary)]" /> Address *</label><textarea name="address" value={formData.address} onChange={handleChange} rows={3} className={inputCls} required placeholder="Enter hospital address" /></div>
            <div className="md:col-span-2"><label className={labelCls}>Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={inputCls} placeholder="Enter hospital description" /></div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
          <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all disabled:opacity-50 text-sm font-medium">
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isLoading ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
