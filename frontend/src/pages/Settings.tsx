// src/pages/Settings.tsx — Users tab REMOVED.
// User management lives ONLY in src/pages/UserManagement.tsx.
// DELETE src/components/settings/UserManagementTab.tsx.
//
// Shell fixes (this is what was making EVERY tab look off, not just Appearance):
//  1. DEAD CODE REMOVED (~120 lines): Settings used to import the whole
//     medical-services store + define load/create/edit/delete handlers,
//     search/filter helpers and a medical sub-tab state — but it renders
//     <MedicalServicesManagement />, which already does all of that itself.
//     None of that code ever rendered. It is gone.
//  2. NO DOUBLE CARD: tab content used to sit inside a big
//     bg-card + p-6 wrapper, and each tab component ALSO renders its own
//     bg-card(s) — card inside card, with p-6 insetting every table so it
//     never filled the tab. Now tab content renders directly, full width,
//     exactly like Patients / UserManagement. Appearance is the one
//     exception: ThemePicker is content-only, so Settings wraps just that
//     one tab in a single card (p-4) — one card, not two.
//  3. DISTINCT TAB ICONS: G-DRG and NHIS both used Shield, so the two tabs
//     looked identical. G-DRG is now DollarSign.
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  Building, Shield, Database, ClipboardList,
  Settings as SettingsIcon, Package, DollarSign, Palette,
} from 'lucide-react';
import CompanySettingsTab from '../components/settings/CompanySettingsTab';
import ServiceCatalogTab from '../components/settings/ServiceCatalogTab';
import MedicalServicesManagement from './MedicalServicesManagement';
import NHISConfigTab from '../components/settings/NHISConfigTab';
import BackupRestoreTab from '../components/settings/BackupRestoreTab';
import GDRGManagement from './GDRGManagement';
import ThemePicker from '../components/ThemePicker';
import { PageHeader } from '../components/ui';

type SettingsTab = 'company' | 'services' | 'medical' | 'gdrg' | 'nhis' | 'appearance' | 'backup';

export default function Settings() {
  const { hasRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const isAdmin = hasRole(['admin', 'super_admin']);

  const mainTabs = [
    { id: 'company' as const, label: 'Company', icon: Building },
    { id: 'services' as const, label: 'Service Catalog', icon: Package },
    { id: 'medical' as const, label: 'Medical Services', icon: ClipboardList },
    { id: 'gdrg' as const, label: 'G-DRG Tariffs', icon: DollarSign },
    { id: 'nhis' as const, label: 'NHIS', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'backup' as const, label: 'Backup', icon: Database },
  ];

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Settings" subtitle="System configuration" icon={SettingsIcon} accent="cyan" backTo="/dashboard" />
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
      <PageHeader
        title="System Settings"
        subtitle="Manage hospital configuration and settings"
        icon={SettingsIcon}
        accent="cyan"
        backTo="/dashboard"
      />

      {/* Tab bar — same Segmented pill bar as UserManagement / Patients */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-1 flex gap-1 overflow-x-auto">
        {mainTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === id ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Tab content — NO wrapping card / p-6 here. Each tab component owns
          its own cards/tables and fills the full width, like every other page.
          Appearance is the exception: ThemePicker is content-only, so it gets
          the one card it needs, at the same p-4 density as the other tabs. */}
      <div className="w-full min-w-0">
        {activeTab === 'company' && <CompanySettingsTab />}
        {activeTab === 'services' && <ServiceCatalogTab />}
        {activeTab === 'medical' && <MedicalServicesManagement />}
        {activeTab === 'gdrg' && <GDRGManagement />}
        {activeTab === 'nhis' && <NHISConfigTab />}
        {activeTab === 'appearance' && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 sm:p-5">
            <ThemePicker />
          </div>
        )}
        {activeTab === 'backup' && <BackupRestoreTab />}
      </div>
    </div>
  );
}
