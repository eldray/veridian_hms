// src/components/settings/NHISConfigTab.tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { Save, Shield, Building, FileText, Globe, Key, CheckCircle } from 'lucide-react';

export default function NHISConfigTab() {
  const { nhisConfig, getNHISConfig, updateNHISConfig } = useSettingsStore();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    providerId: '',
    facilityCode: '',
    accreditationNumber: '',
    tariffVersion: '2024',
    claimEndpoint: 'https://claims.nhis.gov.gh/submit',
    isActive: true
  });

  useEffect(() => {
    loadNHISConfig();
  }, []);

  const loadNHISConfig = async () => {
    try {
      const config = await getNHISConfig();
      if (config) {
        setFormData(config);
      }
    } catch (err) {
      error('Load Failed', 'Failed to load NHIS configuration');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateNHISConfig(formData);
      success('NHIS Configuration Updated', 'NHIS settings saved successfully');
    } catch (err) {
      error('Save Failed', 'Failed to save NHIS configuration');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center gap-2.5 mb-3">
          <Shield className="w-6 h-6 text-[var(--icon-cyan-text)]" />
          <h3 className="text-lg font-bold text-[var(--text-primary)]">NHIS Configuration</h3>
        </div>
        <p className="text-[var(--text-secondary)] text-sm">Required for NHIS billing and claims processing.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1.5">
              <Key className="w-4 h-4" /> Provider ID *
            </label>
            <input 
              type="text" 
              name="providerId"
              required 
              value={formData.providerId}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="NHIS-001234" 
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1.5">
              <Building className="w-4 h-4" /> Facility Code *
            </label>
            <input 
              type="text" 
              name="facilityCode"
              required 
              value={formData.facilityCode}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="GH-12345" 
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1.5">
              <FileText className="w-4 h-4" /> Accreditation Number *
            </label>
            <input 
              type="text" 
              name="accreditationNumber"
              required 
              value={formData.accreditationNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="ACC-2024-001" 
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5">Tariff Version</label>
            <select 
              name="tariffVersion"
              value={formData.tariffVersion}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1.5">
              <Globe className="w-4 h-4" /> Claim Endpoint
            </label>
            <input 
              type="url" 
              name="claimEndpoint"
              value={formData.claimEndpoint}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="https://claims.nhis.gov.gh/submit" 
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="rounded border-[var(--border-color)] text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)] bg-[var(--bg-main)]"
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">Enable NHIS</span>
          </label>
          {formData.isActive && (
            <div className="flex items-center gap-1.5 text-[var(--icon-green-text)]">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Active</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
          <button 
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}