// src/components/settings/NHISConfigTab.tsx - PROFESSIONAL REDESIGN
// Logic untouched: every field, load/save/test/reset, validation and endpoint
// is exactly as before. Only layout changed:
//  - Removed the standalone "NHIS Configuration" header card — Settings already
//    has a tab label, and the extra card pushed everything down.
//  - Sections are bg-card (not bg-main) with p-4, same as every other page.
//  - Denser: space-y-4, gap-4, p-4, text-md -> text-sm headings.
//  - No code removed.
import { useState, useEffect } from 'react';
import { useToast } from '../../store/toastStore';
import { Save, Shield, Building, FileText, Globe, Key, CheckCircle, Loader, AlertCircle, X, TestTube } from 'lucide-react';
import api from '../../api/api';

interface NHISConfigData {
  nhisFacilityCode: string;
  nhisFacilityType: string;
  nhisAccreditationNumber: string;
  nhisAccreditationDate?: string;
  nhisAccreditationExpiry?: string;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  nhisApiBaseUrl?: string;
  nhisApiClientId?: string;
  nhisApiClientSecret?: string;
  nhisApiTokenEndpoint?: string;
  nhisApiEligibilityEndpoint?: string;
  nhisApiCccEndpoint?: string;
  nhisApiActive: boolean;
}

export default function NHISConfigTab() {
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState<NHISConfigData>({ nhisFacilityCode: '', nhisFacilityType: 'Primary', nhisAccreditationNumber: '', nhisApiBaseUrl: '', nhisApiClientId: '', nhisApiClientSecret: '', nhisApiTokenEndpoint: '', nhisApiEligibilityEndpoint: '', nhisApiCccEndpoint: '', nhisApiActive: false });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const facilityTypes = ['CHPS', 'Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'];

  const loadNHISConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiStatusResponse = await api.get('/settings/nhis/status');
      const apiStatus = apiStatusResponse.data?.data || apiStatusResponse.data || apiStatusResponse;
      setFormData({ nhisFacilityCode: apiStatus.nhisFacilityCode || '', nhisFacilityType: apiStatus.nhisFacilityType || 'Primary', nhisAccreditationNumber: apiStatus.nhisAccreditationNumber || '', nhisAccreditationDate: apiStatus.nhisAccreditationDate, nhisAccreditationExpiry: apiStatus.nhisAccreditationExpiry, nhisContactPerson: apiStatus.nhisContactPerson || '', nhisContactPhone: apiStatus.nhisContactPhone || '', nhisContactEmail: apiStatus.nhisContactEmail || '', nhisApiBaseUrl: apiStatus.apiBaseUrl || '', nhisApiClientId: apiStatus.clientId || '', nhisApiClientSecret: '', nhisApiTokenEndpoint: apiStatus.tokenEndpoint || '', nhisApiEligibilityEndpoint: apiStatus.eligibilityEndpoint || '', nhisApiCccEndpoint: apiStatus.cccEndpoint || '', nhisApiActive: Boolean(apiStatus.active ?? apiStatus.isActive) });
    } catch (err: any) {
      console.error('Failed to load NHIS config:', err);
      setError(err.response?.data?.message || 'Failed to load NHIS configuration');
    } finally { setIsLoading(false); }
  };

  const saveNHISConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put('/settings/nhis/config', { nhisApiBaseUrl: formData.nhisApiBaseUrl, nhisApiClientId: formData.nhisApiClientId, nhisApiClientSecret: formData.nhisApiClientSecret || undefined, nhisApiTokenEndpoint: formData.nhisApiTokenEndpoint, nhisApiEligibilityEndpoint: formData.nhisApiEligibilityEndpoint, nhisApiCccEndpoint: formData.nhisApiCccEndpoint, nhisApiActive: formData.nhisApiActive, nhisFacilityCode: formData.nhisFacilityCode, nhisFacilityType: formData.nhisFacilityType, nhisAccreditationNumber: formData.nhisAccreditationNumber, nhisContactPerson: formData.nhisContactPerson, nhisContactPhone: formData.nhisContactPhone, nhisContactEmail: formData.nhisContactEmail });
      setHasChanges(false);
      success('NHIS Configuration Updated', 'NHIS settings saved successfully');
    } catch (err: any) {
      console.error('Failed to save NHIS config:', err);
      setError(err.response?.data?.message || 'Failed to save NHIS configuration');
      toastError('Save Failed', err.response?.data?.message || 'Failed to save NHIS configuration');
    } finally { setIsLoading(false); }
  };

  const testNHISConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await api.post('/settings/nhis/test-connection');
      const result = response.data?.data || response.data;
      const message = result?.message || 'NHIS API connection successful';
      setTestResult({ success: response.data?.success ?? true, message });
      success('Connection Test', message);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Connection failed';
      setTestResult({ success: false, message: errorMsg });
      toastError('Connection Failed', errorMsg);
    } finally { setIsTesting(false); }
  };

  useEffect(() => { loadNHISConfig(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nhisFacilityCode.trim()) { toastError('Validation Error', 'Facility Code is required'); return; }
    if (!formData.nhisAccreditationNumber.trim()) { toastError('Validation Error', 'Accreditation Number is required'); return; }
    await saveNHISConfig();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setHasChanges(true);
  };

  const handleReset = () => { loadNHISConfig(); setHasChanges(false); setTestResult(null); };

  if (isLoading && !formData.nhisFacilityCode) {
    return (<div className="w-full space-y-4"><div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center"><Loader className="w-8 h-8 animate-spin text-[var(--icon-cyan-text)] mx-auto mb-4" /><p className="text-[var(--text-secondary)] text-sm">Loading NHIS configuration...</p></div></div>);
  }

  const inputCls = "w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] focus:outline-none text-sm";
  const labelCls = "text-sm font-medium text-[var(--text-primary)] mb-1 block";

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3"><div className="flex items-center gap-2 text-red-800 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="font-medium">Error:</span><span>{error}</span><button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button></div></div>
      )}
      {testResult && (
        <div className={`rounded-lg p-3 border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><div className="flex items-center gap-2 text-sm">{testResult.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}<span className={testResult.success ? 'text-green-800' : 'text-red-800'}>{testResult.message}</span><button onClick={() => setTestResult(null)} className="ml-auto"><X className="w-4 h-4" /></button></div></div>
      )}

      {/* Header row — replaces the standalone header card */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2"><Shield className="w-4 h-4 text-[var(--icon-cyan-text)]" /> NHIS Configuration</h3><p className="text-sm text-[var(--text-secondary)] mt-0.5">Configure NHIS settings for billing and claims processing.</p></div>
        {formData.nhisApiActive && (<span className="text-green-600 font-medium text-sm inline-flex items-center gap-1 shrink-0"><CheckCircle className="w-3 h-3" /> Integration Active</span>)}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Facility Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1"><Building className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Facility Code *</label><input type="text" name="nhisFacilityCode" required value={formData.nhisFacilityCode} onChange={handleChange} className={inputCls} placeholder="GH-12345" /><p className="text-xs text-[var(--text-tertiary)] mt-1">Your NHIS facility code</p></div>
            <div><label className={labelCls}>Facility Type</label><select name="nhisFacilityType" value={formData.nhisFacilityType} onChange={handleChange} className={inputCls}>{facilityTypes.map(type => (<option key={type} value={type}>{type.replace('_', ' ')}</option>))}</select></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1"><FileText className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Accreditation Number *</label><input type="text" name="nhisAccreditationNumber" required value={formData.nhisAccreditationNumber} onChange={handleChange} className={inputCls} placeholder="ACC-2024-001" /></div>
            <div><label className={labelCls}>Contact Person</label><input type="text" name="nhisContactPerson" value={formData.nhisContactPerson || ''} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Contact Phone</label><input type="tel" name="nhisContactPhone" value={formData.nhisContactPhone || ''} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Contact Email</label><input type="email" name="nhisContactEmail" value={formData.nhisContactEmail || ''} onChange={handleChange} className={inputCls} /></div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">API Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1"><Globe className="w-4 h-4 text-[var(--icon-cyan-text)]" /> API Base URL</label><input type="url" name="nhisApiBaseUrl" value={formData.nhisApiBaseUrl || ''} onChange={handleChange} className={inputCls} placeholder="https://api.nhis.gov.gh/v1" /></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1"><Key className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Client ID</label><input type="text" name="nhisApiClientId" value={formData.nhisApiClientId || ''} onChange={handleChange} className={inputCls} /></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-1"><Key className="w-4 h-4 text-[var(--icon-cyan-text)]" /> Client Secret</label><input type="password" name="nhisApiClientSecret" value={formData.nhisApiClientSecret || ''} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Token Endpoint</label><input type="url" name="nhisApiTokenEndpoint" value={formData.nhisApiTokenEndpoint || ''} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Eligibility Endpoint</label><input type="url" name="nhisApiEligibilityEndpoint" value={formData.nhisApiEligibilityEndpoint || ''} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>CCC Endpoint</label><input type="url" name="nhisApiCccEndpoint" value={formData.nhisApiCccEndpoint || ''} onChange={handleChange} className={inputCls} /></div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">NHIS Integration Status</h4><p className="text-sm text-[var(--text-secondary)]">{formData.nhisApiActive ? 'NHIS claims and billing are currently enabled' : 'NHIS integration is currently disabled'}</p></div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative"><input type="checkbox" name="nhisApiActive" checked={formData.nhisApiActive} onChange={handleChange} className="sr-only" /><div className={`w-12 h-6 rounded-full transition-colors ${formData.nhisApiActive ? 'bg-green-500' : 'bg-gray-300'}`}></div><div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.nhisApiActive ? 'transform translate-x-6' : ''}`}></div></div>
              <div className="flex items-center gap-2">{formData.nhisApiActive ? (<><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-medium text-green-600">Active</span></>) : (<span className="text-sm font-medium text-[var(--text-secondary)]">Inactive</span>)}</div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-[var(--border-color)]">
          <div className="flex gap-2">
            <button type="button" onClick={testNHISConnection} disabled={isTesting} className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm font-medium transition-colors">{isTesting ? <Loader className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}{isTesting ? 'Testing...' : 'Test Connection'}</button>
            {hasChanges && (<button type="button" onClick={handleReset} disabled={isLoading} className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm font-medium transition-colors">Discard Changes</button>)}
          </div>
          <button type="submit" disabled={isLoading || !hasChanges} className="flex items-center gap-2 px-6 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 text-sm font-medium transition-colors">{isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isLoading ? 'Saving...' : 'Save Configuration'}</button>
        </div>
      </form>
    </div>
  );
}
