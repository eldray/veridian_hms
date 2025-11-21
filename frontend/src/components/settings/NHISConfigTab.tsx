// src/components/settings/NHISConfigTab.tsx - OPTIMIZED VERSION
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { Save, Shield, Building, FileText, Globe, Key, CheckCircle, Loader, AlertCircle } from 'lucide-react';

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

  // Clear errors when component unmounts
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

  // Update form when config loads
  useEffect(() => {
    if (nhisConfig && Object.keys(nhisConfig).length > 0) {
      console.log('📋 NHIS Config loaded:', nhisConfig);
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
    
    // Enhanced validation
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

    // Validate facility code format (example: GH-12345)
    const facilityCodeRegex = /^[A-Z]{2}-\d{5}$/;
    if (!facilityCodeRegex.test(formData.facilityCode)) {
      toastError('Validation Error', 'Facility Code should be in format: GH-12345');
      return;
    }

    // Validate URL format
    if (formData.claimEndpoint && !isValidUrl(formData.claimEndpoint)) {
      toastError('Validation Error', 'Please enter a valid claim endpoint URL');
      return;
    }

    try {
      console.log('💾 Saving NHIS config:', formData);
      await updateNHISConfig(formData);
      setHasChanges(false);
      success('NHIS Configuration Updated', 'NHIS settings saved successfully');
    } catch (err: any) {
      console.error('Save failed:', err);
      toastError('Save Failed', err.response?.data?.message || 'Failed to save NHIS configuration');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    setHasChanges(true);
  };

  const handleReset = () => {
    if (nhisConfig) {
      setFormData(nhisConfig);
      setHasChanges(false);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Show loading state during initial load
  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2.5 mb-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">NHIS Configuration</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading NHIS configuration...</p>
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
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2.5 mb-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">NHIS Configuration</h3>
        </div>
        <p className="text-gray-500 text-sm">
          Configure NHIS settings for billing and claims processing. 
          {formData.isActive && (
            <span className="text-green-600 font-medium ml-2">
              ✓ NHIS integration is currently active
            </span>
          )}
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">NHIS Credentials</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provider ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                <Key className="w-4 h-4 text-blue-600" /> 
                Provider ID *
              </label>
              <input 
                type="text" 
                name="providerId"
                required 
                value={formData.providerId}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                placeholder="NHIS-001234" 
              />
              <p className="text-xs text-gray-500 mt-1">Your NHIS provider identification number</p>
            </div>

            {/* Facility Code */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                <Building className="w-4 h-4 text-blue-600" /> 
                Facility Code *
              </label>
              <input 
                type="text" 
                name="facilityCode"
                required 
                value={formData.facilityCode}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                placeholder="GH-12345" 
              />
              <p className="text-xs text-gray-500 mt-1">Format: GH-12345</p>
            </div>

            {/* Accreditation Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                <FileText className="w-4 h-4 text-blue-600" /> 
                Accreditation Number *
              </label>
              <input 
                type="text" 
                name="accreditationNumber"
                required 
                value={formData.accreditationNumber}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                placeholder="ACC-2024-001" 
              />
              <p className="text-xs text-gray-500 mt-1">Your NHIS accreditation certificate number</p>
            </div>

            {/* Tariff Version */}
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2">Tariff Version</label>
              <select 
                name="tariffVersion"
                value={formData.tariffVersion}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
              >
                <option value="2024">2024 Version</option>
                <option value="2023">2023 Version</option>
                <option value="2022">2022 Version</option>
                <option value="2021">2021 Version</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Current NHIS tariff version</p>
            </div>

            {/* Claim Endpoint */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                <Globe className="w-4 h-4 text-blue-600" /> 
                Claim Endpoint URL
              </label>
              <input 
                type="url" 
                name="claimEndpoint"
                value={formData.claimEndpoint}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                placeholder="https://claims.nhis.gov.gh/submit" 
              />
              <p className="text-xs text-gray-500 mt-1">NHIS claim submission endpoint</p>
            </div>
          </div>
        </div>
        
        {/* Activation Toggle */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-1">NHIS Integration Status</h4>
              <p className="text-sm text-gray-500">
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
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-gray-600">Inactive</span>
                )}
              </div>
            </label>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {hasChanges && (
              <span className="text-orange-600 font-medium">• You have unsaved changes</span>
            )}
          </div>
          
          <div className="flex gap-3">
            {hasChanges && (
              <button 
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Discard Changes
              </button>
            )}
            
            <button 
              type="submit"
              disabled={isLoading || !hasChanges}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}