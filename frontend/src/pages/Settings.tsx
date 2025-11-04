// src/pages/Settings.tsx - UPDATED WITH CONSISTENT UI THEME
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Save, Building, Users, Settings as SettingsIcon, Hospital, Shield, Download, Upload, Database, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import CompanyDetailsForm from '../components/CompanyDetailsForm';

export default function Settings() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuthStore();
  const { 
    hospital, 
    getHospitalDetails, 
    isLoading,
    createBackup,
    restoreBackup,
    getSystemLogs,
    getBackupList 
  } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'system' | 'backup'>('company');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isAdmin = hasRole(['admin']);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'company') {
        getHospitalDetails();
      } else if (activeTab === 'backup') {
        loadBackups();
      }
    }
  }, [isAdmin, activeTab, getHospitalDetails]);

  const loadBackups = async () => {
    try {
      const backupList = await getBackupList();
      setBackups(backupList);
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await createBackup();
      setMessage({ type: 'success', text: `Backup created successfully: ${result.filename}` });
      await loadBackups();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a backup file' });
      return;
    }

    setBackupLoading(true);
    try {
      await restoreBackup(selectedFile);
      setMessage({ type: 'success', text: 'Backup restored successfully' });
      setSelectedFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to restore backup' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-blue-100 text-lg">System configuration</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
          <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 text-lg">Only administrators can access system settings.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'company' as const, label: 'Company Details', icon: Building },
    { id: 'users' as const, label: 'User Management', icon: Users },
    { id: 'backup' as const, label: 'Backup & Restore', icon: Database },
    { id: 'system' as const, label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">System Settings</h1>
              <p className="text-blue-100 text-lg">Manage hospital details and system configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-2 p-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-8">
          {/* Message */}
          {message.text && (
            <div className={`p-4 rounded-xl mb-6 border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          {/* Company Details Tab */}
          {activeTab === 'company' && (
            <CompanyDetailsForm 
              hospital={hospital}
              isLoading={isLoading}
              onSuccess={(message) => setMessage({ type: 'success', text: message })}
              onError={(message) => setMessage({ type: 'error', text: message })}
            />
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && <UserManagement />}

          {/* Backup & Restore Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Backup */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="w-8 h-8 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Create Backup</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Create a complete backup of the system database including all patient records, 
                    attendances, and system data.
                  </p>
                  <button
                    onClick={handleCreateBackup}
                    disabled={backupLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {backupLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    {backupLoading ? 'Creating Backup...' : 'Create Database Backup'}
                  </button>
                </div>

                {/* Restore Backup */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Upload className="w-8 h-8 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-900">Restore Backup</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Restore the system from a previously created backup file. This will replace all current data.
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Backup File
                    </label>
                    <input
                      type="file"
                      accept=".json,.backup"
                      onChange={handleFileSelect}
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                    />
                    {selectedFile && (
                      <p className="text-sm text-green-600 mt-2">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleRestoreBackup}
                    disabled={backupLoading || !selectedFile}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {backupLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    {backupLoading ? 'Restoring...' : 'Restore from Backup'}
                  </button>
                </div>
              </div>

              {/* Backup List */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Available Backups</h3>
                  <button
                    onClick={loadBackups}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {backups.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No backups available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {backups.map((backup, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{backup.filename}</p>
                            <p className="text-sm text-gray-600">
                              Created: {new Date(backup.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              Size: {(backup.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="px-4 py-2 text-blue-600 hover:text-blue-700 font-semibold hover:bg-blue-50 rounded-lg transition-colors">
                              Download
                            </button>
                            <button className="px-4 py-2 text-green-600 hover:text-green-700 font-semibold hover:bg-green-50 rounded-lg transition-colors">
                              Restore
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h4 className="font-bold text-red-800 mb-2 text-lg">⚠️ Important Notice</h4>
                <ul className="text-red-700 space-y-2">
                  <li>• Backup creation may take several minutes for large databases</li>
                  <li>• Restoring from backup will replace ALL current data</li>
                  <li>• Ensure you have a current backup before performing any restore operation</li>
                  <li>• System will be temporarily unavailable during backup/restore operations</li>
                </ul>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <h3 className="font-bold text-amber-800 mb-2 text-lg">System Configuration</h3>
                <p className="text-amber-700">
                  System-wide settings and configurations will be available here.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">System Logs</h4>
                  <p className="text-gray-600 mb-4">View system activity and error logs</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold">
                    View Logs
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">Email Settings</h4>
                  <p className="text-gray-600 mb-4">Configure email notifications and SMTP</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold">
                    Configure
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">API Configuration</h4>
                  <p className="text-gray-600 mb-4">Manage API keys and integrations</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold">
                    Manage API
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">System Maintenance</h4>
                  <p className="text-gray-600 mb-4">Perform system maintenance tasks</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold">
                    Maintenance
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
