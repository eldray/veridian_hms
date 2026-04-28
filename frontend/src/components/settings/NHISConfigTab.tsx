// src/components/settings/NHISConfigTab.tsx - UPDATED THEME
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { Save, Shield, Building, FileText, Globe, Key, CheckCircle, Loader, AlertCircle, X } from 'lucide-react';

export default function NHISConfigTab() {
  const { nhisConfig, getNHISConfig, updateNHISConfig, isLoading, error, clearError } = useSettingsStore();
  const { success, error: toastError } = useToast();
  
  const [formData, setFormData] = useState({
    providerId: '',
    facilityCode: '',
    accreditationNumber: '',
    tariffVersion: '2024',
    claimEndpoint: 'https://claims.nhis.gov.gh/submit',
    isActive: false
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadNHISConfig();
  }, []);

  useEffect(() => {
    return () => {
      if (error) clearError();
    };
  }, [error, clearError]);

  const loadNHISConfig = async () => {
    try {
      setIsInitialLoad(true);
      await getNHISConfig();
    } catch (err) {
      console.error('Failed to load NHIS config:', err);
    } finally {
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    if (nhisConfig && Object.keys(nhisConfig).length > 0) {
      setFormData({
        providerId: nhisConfig.providerId || '',
        facilityCode: nhisConfig.facilityCode || '',
        accreditationNumber: nhisConfig.accreditationNumber || '',
        tariffVersion: nhisConfig.tariffVersion || '2024',
        claimEndpoint: nhisConfig.claimEndpoint || 'https://claims.nhis.gov.gh/submit',
        isActive: nhisConfig.isActive || false
      });
      setHasChanges(false);
    }
  }, [nhisConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.providerId.trim()) {
      toastError('Validation Error', 'Provider ID is required');
      return;
    }
    if (!formData.facilityCode.trim()) {
      toastError('Validation Error', 'Facility Code is required');
      return;
    }
    if (!formData.accreditationNumber.trim()) {
      toastError('Validation Error', 'Accreditation Number is required');
      return;
    }

    const facilityCodeRegex = /^[A-Z]{2}-\d{5}$/;
    if (!facilityCodeRegex.test(formData.facilityCode)) {
      toastError('Validation Error', 'Facility Code should be in format: GH-12345');
      return;
    }

    try {
      await updateNHISConfig(formData);
      setHasChanges(false);
      success('NHIS Configuration Updated', 'NHIS settings saved successfully');
    } catch (err: any) {
      toastError('Save Failed', err.response?.data?.message || 'Failed to save NHIS configuration');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setHasChanges(true);
  };

  const handleReset = () => {
    if (nhisConfig) {
      setFormData(nhisConfig);
      setHasChanges(false);
    }
  };

  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
          <Loader className="w-8 h-8 animate-spin text-[var(--icon-cyan-text)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-sm">Loading NHIS configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center gap-2.5 mb-2">
          <Shield className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          <h3 className="text-lg font-bold text-[var(--text-primary)]">NHIS Configuration</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure NHIS settings for billing and claims processing.
          {formData.isActive && (
            <span className="text-green-600 font-medium ml-2 inline-flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Integration Active
            </span>
          )}
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[var(--bg-main)] rounded-xl p-5 border border-[var(--border-color)]">
          <h4 className="text-md font-semibold text-[var(--text-primary)] mb-4">NHIS Credentials</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1">
                <Key className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Provider ID *
              </label>
              <input 
                type="text" 
                name="providerId"
                required 
                value={formData.providerId}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                placeholder="NHIS-001234" 
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Your NHIS provider identification number</p>
            </div>

            {/* Facility Code */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1">
                <Building className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Facility Code *
              </label>
              <input 
                type="text" 
                name="facilityCode"
                required 
                value={formData.facilityCode}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                placeholder="GH-12345" 
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Format: GH-12345</p>
            </div>

            {/* Accreditation Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1">
                <FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Accreditation Number *
              </label>
              <input 
                type="text" 
                name="accreditationNumber"
                required 
                value={formData.accreditationNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                placeholder="ACC-2024-001" 
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Your NHIS accreditation certificate number</p>
            </div>

            {/* Tariff Version */}
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Tariff Version</label>
              <select 
                name="tariffVersion"
                value={formData.tariffVersion}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
              >
                <option value="2024">2024 Version</option>
                <option value="2023">2023 Version</option>
                <option value="2022">2022 Version</option>
                <option value="2021">2021 Version</option>
              </select>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Current NHIS tariff version</p>
            </div>

            {/* Claim Endpoint */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1">
                <Globe className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Claim Endpoint URL
              </label>
              <input 
                type="url" 
                name="claimEndpoint"
                value={formData.claimEndpoint}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                placeholder="https://claims.nhis.gov.gh/submit" 
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">NHIS claim submission endpoint</p>
            </div>
          </div>
        </div>
        
        {/* Activation Toggle */}
        <div className="bg-[var(--bg-main)] rounded-xl p-5 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="text-md font-semibold text-[var(--text-primary)] mb-1">NHIS Integration Status</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                {formData.isActive 
                  ? 'NHIS claims and billing are currently enabled' 
                  : 'NHIS integration is currently disabled'
                }
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  formData.isActive ? 'transform translate-x-6' : ''
                }`}></div>
              </div>
              <div className="flex items-center gap-2">
                {formData.isActive ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Inactive</span>
                )}
              </div>
            </label>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
          <div className="text-sm text-[var(--text-secondary)]">
            {hasChanges && (
              <span className="text-orange-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> You have unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            {hasChanges && (
              <button 
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Discard Changes
              </button>
            )}
            
            <button 
              type="submit"
              disabled={isLoading || !hasChanges}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}