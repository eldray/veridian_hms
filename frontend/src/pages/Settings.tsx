  // src/pages/Settings.tsx
  import { useState, useEffect } from 'react';
  import { useAuthStore } from '../store/authStore';
  import { useToast } from '../store/toastStore';
  import {
    ArrowLeft, Building, Users, Shield, Database, ClipboardList,
    Settings as SettingsIcon
  } from 'lucide-react';
  import { useNavigate } from 'react-router-dom';
  
  // Import tab components
  import CompanySettingsTab from '../components/settings/CompanySettingsTab';
  import UserManagementTab from '../components/settings/UserManagementTab';
  import ServiceCatalogTab from '../components/settings/ServiceCatalogTab';
  import NHISConfigTab from '../components/settings/NHISConfigTab';
  import BackupRestoreTab from '../components/settings/BackupRestoreTab';
  
  export default function Settings() {
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const { error } = useToast();
  
    const [activeTab, setActiveTab] = useState<'company' | 'users' | 'services' | 'nhis' | 'backup'>('company');
  
    const isAdmin = hasRole(['admin']);
  
    const tabs = [
      { id: 'company' as const, label: 'Company', icon: Building },
      { id: 'users' as const, label: 'Users', icon: Users },
      { id: 'services' as const, label: 'Service Catalog', icon: ClipboardList },
      { id: 'nhis' as const, label: 'NHIS', icon: Shield },
      { id: 'backup' as const, label: 'Backup', icon: Database },
    ];
  
    if (!isAdmin) {
      return (
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
                <p className="text-[var(--text-secondary)] text-sm">System configuration</p>
              </div>
            </div>
          </div>
  
          {/* Access Denied */}
          <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
            <SettingsIcon className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Access Restricted</h2>
            <p className="text-[var(--text-secondary)]">Only administrators can access system settings.</p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">System Settings</h1>
              <p className="text-[var(--text-secondary)] text-sm">Manage hospital configuration and settings</p>
            </div>
          </div>
        </div>
  
        {/* Tabs Navigation */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="border-b border-[var(--border-color)]">
            <nav className="flex overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all text-sm font-medium whitespace-nowrap ${
                    activeTab === id
                      ? 'border-[var(--icon-cyan-text)] text-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
  
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'company' && <CompanySettingsTab />}
            {activeTab === 'users' && <UserManagementTab />}
            {activeTab === 'services' && <ServiceCatalogTab />}
            {activeTab === 'nhis' && <NHISConfigTab />}
            {activeTab === 'backup' && <BackupRestoreTab />}
          </div>
        </div>
      </div>
    );
  }   