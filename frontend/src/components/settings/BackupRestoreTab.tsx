// src/components/settings/BackupRestoreTab.tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { Download, Upload, RefreshCw, Database } from 'lucide-react';

export default function BackupRestoreTab() {
  const { createBackup, restoreBackup, getBackupList } = useSettingsStore();
  const { success, error } = useToast();
  
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const list = await getBackupList();
      setBackups(list);
    } catch {
      error('Load failed', 'Could not load backups');
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await createBackup();
      success('Backup Created', `Backup created: ${result.filename}`);
      await loadBackups();
    } catch {
      error('Backup failed', 'Could not create backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      error('No file selected', 'Please select a backup file');
      return;
    }
    
    setBackupLoading(true);
    try {
      await restoreBackup(selectedFile);
      success('Backup Restored', 'Database restored successfully');
      setSelectedFile(null);
    } catch {
      error('Restore failed', 'Could not restore backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center gap-2.5 mb-3">
          <Database className="w-6 h-6 text-[var(--icon-cyan-text)]" />
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Backup & Restore</h3>
        </div>
        <p className="text-[var(--text-secondary)] text-sm">Create backups and restore your system data.</p>
      </div>

      {/* Backup Actions */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleCreateBackup} 
            disabled={backupLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Create Backup
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] cursor-pointer text-sm font-medium">
            <Upload className="w-4 h-4" />
            Select Backup File
            <input 
              type="file" 
              accept=".sql,.zip,.backup" 
              onChange={handleFileSelect} 
              className="hidden" 
            />
          </label>
          
          <button 
            onClick={handleRestoreBackup} 
            disabled={backupLoading || !selectedFile}
            className="px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            Restore
          </button>
          
          <button 
            onClick={loadBackups} 
            disabled={backupLoading}
            className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${backupLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {selectedFile && (
          <p className="text-sm text-[var(--text-secondary)] mt-3">
            Selected: <span className="font-medium">{selectedFile.name}</span>
          </p>
        )}
      </div>

      {/* Backup List */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h4 className="font-semibold text-[var(--text-primary)]">Available Backups</h4>
        </div>
        <div className="divide-y divide-[var(--border-color)]">
          {backups.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">No backups found</p>
            </div>
          ) : (
            backups.map(backup => (
              <div key={backup.filename} className="flex justify-between items-center p-4 hover:bg-[var(--bg-main)] transition-colors">
                <div>
                  <span className="font-medium text-[var(--text-primary)] text-sm">{backup.filename}</span>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {new Date(backup.date).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  {backup.size ? `(${backup.size})` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}