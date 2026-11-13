// src/components/settings/BackupRestoreTab.tsx - PROFESSIONAL REDESIGN
// Logic untouched: every handler, field, validation and API call is exactly as before.
// Only layout changed: denser stats, header+actions row, backup list is now a
// TABLE (Filename | Created | Size | Actions) — one data point per column,
// same as Patients / Audit Logs / Service Catalog list view. No stacked cells,
// no card-inside-card, no huge centered stat cards.
import { useState, useEffect } from 'react';
import { confirmDialog } from '../../context/ConfirmDialog';
import { useToast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { Download, Upload, RefreshCw, Database, Trash2, Loader, AlertCircle } from 'lucide-react';
import api from '../../api/api';

interface BackupFile {
  filename: string;
  size: number;
  sizeFormatted?: string;
  createdAt: string;
  modifiedAt?: string;
  path?: string;
}

export default function BackupRestoreTab() {
  const { success, error: toastError } = useToast();
  const { user: currentUser } = useAuthStore();
  const canRestoreBackup = currentUser?.role === 'super_admin';
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingBackup, setDeletingBackup] = useState<BackupFile | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [pagination, setPagination] = useState<any>(null);

  const loadBackups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/backup');
      let backupList = [];
      let paginationData = null;
      if (response.data?.data && Array.isArray(response.data.data)) {
        backupList = response.data.data;
        paginationData = response.data.pagination;
      } else if (response.data?.backups && Array.isArray(response.data.backups)) {
        backupList = response.data.backups;
        paginationData = response.data.pagination;
      } else if (Array.isArray(response.data)) {
        backupList = response.data;
      } else if (response.data?.success && response.data?.data) {
        backupList = response.data.data;
      } else {
        backupList = [];
      }
      const formattedBackups = backupList.map((backup: any) => ({
        filename: backup.filename,
        size: backup.size || 0,
        sizeFormatted: formatFileSize(backup.size || 0),
        createdAt: backup.createdAt || backup.date || backup.modifiedAt,
        modifiedAt: backup.modifiedAt || backup.createdAt,
      }));
      setBackups(formattedBackups);
      setPagination(paginationData);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
      setError(err.response?.data?.message || 'Failed to load backup list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setError(null);
    try {
      const response = await api.post('/backup');
      const result = response.data?.data || response.data;
      success('Backup Created', `Backup created: ${result.filename || 'successfully'}`);
      await loadBackups();
    } catch (err: any) {
      console.error('Backup failed:', err);
      toastError('Backup Failed', err.response?.data?.message || 'Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      toastError('No file selected', 'Please select a backup file');
      return;
    }
    const validExtensions = ['.sql', '.backup', '.dump'];
    const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      toastError('Invalid File', 'Please select a valid backup file (.sql, .backup, .dump)');
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      toastError('File Too Large', 'Backup file must be smaller than 100MB');
      return;
    }
    if (!(await confirmDialog({ title: 'Restore database', message: 'Restoring a backup will overwrite current data. This action cannot be undone. Continue?', confirmText: 'Restore' }))) return;
    setRestoring(true);
    setError(null);
    const formData = new FormData();
    formData.append('backup', selectedFile);
    try {
      const response = await api.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      success('Backup Restored', 'Database restored successfully');
      setSelectedFile(null);
      await loadBackups();
      setTimeout(async () => {
        if (await confirmDialog({ title: 'Restore completed', message: 'Restore completed. Would you like to refresh the page?', confirmText: 'Refresh', type: 'success' })) {
          window.location.reload();
        }
      }, 1000);
    } catch (err: any) {
      console.error('Restore failed:', err);
      toastError('Restore Failed', err.response?.data?.message || 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const handleDownloadBackup = async (backup: BackupFile) => {
    setDownloadingBackup(backup.filename);
    setError(null);
    try {
      const response = await api.get(`/backup/download/${backup.filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      success('Download Complete', `${backup.filename} downloaded successfully`);
    } catch (err: any) {
      console.error('Download failed:', err);
      toastError('Download Failed', err.response?.data?.message || 'Failed to download backup');
    } finally {
      setDownloadingBackup(null);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deletingBackup) return;
    try {
      await api.delete(`/backup/${encodeURIComponent(deletingBackup.filename)}`);
      success('Backup Deleted', `${deletingBackup.filename} has been deleted`);
      setDeletingBackup(null);
      await loadBackups();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toastError('Delete Failed', err.response?.data?.message || 'Failed to delete backup');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateValue: string | Date | undefined) => {
    if (!dateValue) return 'Unknown date';
    try {
      let date: Date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          const match = dateValue.match(/backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-\d{3}Z/);
          if (match) {
            const [, year, month, day, hour, minute, second] = match;
            date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)));
          }
        }
      } else {
        date = new Date(dateValue);
      }
      if (isNaN(date.getTime())) {
        return 'Date unavailable';
      }
      return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const backupList = Array.isArray(backups) ? backups : [];

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats — dense, icon-left, same pattern as Patients / Service Catalog */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center shrink-0"><Database className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div>
          <div><p className="text-xl font-bold leading-none text-[var(--text-primary)]">{backupList.length}</p><p className="text-xs text-[var(--text-secondary)] mt-1">Backups Available</p></div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-xl flex items-center justify-center shrink-0"><Download className="w-5 h-5 text-[var(--icon-green-text)]" /></div>
          <div><p className="text-xl font-bold leading-none text-[var(--text-primary)]">{backupList.length}</p><p className="text-xs text-[var(--text-secondary)] mt-1">Ready to Download</p></div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--icon-yellow-bg)] rounded-xl flex items-center justify-center shrink-0"><Upload className="w-5 h-5 text-[var(--icon-yellow-text)]" /></div>
          <div><p className="text-xl font-bold leading-none text-[var(--text-primary)]">{selectedFile ? '1' : '0'}</p><p className="text-xs text-[var(--text-secondary)] mt-1">{canRestoreBackup ? 'Selected for Restore' : 'Restore Restricted'}</p></div>
        </div>
      </div>

      {/* Actions — single row, header pattern, not a big padded card */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCreateBackup} disabled={creatingBackup || restoring} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium">
            {creatingBackup ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}{creatingBackup ? 'Creating...' : 'Create Backup'}
          </button>
          {canRestoreBackup && (
            <label className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] cursor-pointer text-sm font-medium transition-all">
              <Upload className="w-4 h-4" /> Select Backup File
              <input type="file" accept=".sql,.backup,.dump" onChange={handleFileSelect} className="hidden" />
            </label>
          )}
          {canRestoreBackup && (
            <button onClick={handleRestoreBackup} disabled={restoring || creatingBackup || !selectedFile} className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium">
              {restoring ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{restoring ? 'Restoring...' : 'Restore Backup'}
            </button>
          )}
          <button onClick={loadBackups} disabled={isLoading} className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        {selectedFile && (
          <div className="mt-3 p-3 bg-[var(--icon-cyan-bg)]/10 rounded-lg border border-[var(--icon-cyan-bg)]/30 flex items-center justify-between flex-wrap gap-2">
            <div className="min-w-0"><p className="text-sm font-medium text-[var(--text-primary)] truncate">{selectedFile.name}</p><p className="text-xs text-[var(--text-secondary)] mt-0.5">Size: {formatFileSize(selectedFile.size)}</p></div>
            <button onClick={() => setSelectedFile(null)} className="text-[var(--icon-red-text)] hover:opacity-80 text-sm font-medium shrink-0">Clear</button>
          </div>
        )}
      </div>

      {/* Backup list — TABLE: Filename | Created | Size | Actions */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--icon-cyan-text)]" />
          <h4 className="font-semibold text-[var(--text-primary)] text-sm">Available Backups</h4>
        </div>
        {isLoading && backupList.length === 0 ? (
          <div className="p-8 text-center"><Loader className="w-8 h-8 animate-spin text-[var(--icon-cyan-text)] mx-auto mb-3" /><p className="text-[var(--text-secondary)] text-sm">Loading backups...</p></div>
        ) : backupList.length === 0 ? (
          <div className="p-8 text-center"><Database className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" /><p className="text-[var(--text-secondary)] text-sm">No backups found</p>
            <button onClick={handleCreateBackup} disabled={creatingBackup} className="mt-3 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium disabled:opacity-50">Create Your First Backup</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">Filename</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">Created</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">Size</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {backupList.map(backup => (
                  <tr key={backup.filename} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5 min-w-0"><Database className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" /><span className="font-medium text-[var(--text-primary)] text-sm truncate">{backup.filename}</span></div></td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">{formatDate(backup.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right whitespace-nowrap">{backup.size ? (backup.sizeFormatted || formatFileSize(backup.size)) : '-'}</td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleDownloadBackup(backup)} disabled={downloadingBackup === backup.filename} className="p-2 text-[var(--text-secondary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)]/20 rounded-lg disabled:opacity-50" title="Download Backup">{downloadingBackup === backup.filename ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}</button>
                      <button onClick={() => setDeletingBackup(backup)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]/20 rounded-lg" title="Delete Backup"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.total > 0 && (
          <div className="bg-[var(--bg-main)] px-4 py-2 border-t border-[var(--border-color)] text-center"><p className="text-xs text-[var(--text-secondary)]">Total backups: {pagination.total} | Total size: {pagination.totalSizeFormatted || formatFileSize(pagination.totalSize || 0)}</p></div>
        )}
      </div>

      {deletingBackup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center"><Trash2 className="w-5 h-5 text-[var(--icon-red-text)]" /></div><div><h3 className="text-lg font-bold text-[var(--text-primary)]">Delete Backup</h3><p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p></div></div>
            <p className="text-[var(--text-secondary)] mb-6 text-sm">Are you sure you want to delete <strong className="font-semibold text-[var(--text-primary)]">{deletingBackup.filename}</strong>? This backup file will be permanently removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingBackup(null)} className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium">Cancel</button>
              <button onClick={handleDeleteBackup} className="px-4 py-2 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-all text-sm font-medium">Delete Backup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
