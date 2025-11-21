// src/components/settings/BackupRestoreTab.tsx - ENHANCED DOWNLOAD
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../store/toastStore';
import { Download, Upload, RefreshCw, Database, Trash2, Loader } from 'lucide-react';

interface BackupFile {
  filename: string;
  size: string;
  date: string;
  path: string;
}

export default function BackupRestoreTab() {
  const { 
    backups, 
    createBackup, 
    restoreBackup, 
    getBackupList, 
    downloadBackup, 
    deleteBackup,
    isLoading,
    error,
    clearError
  } = useSettingsStore();
  
  const { success, error: toastError } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingBackup, setDeletingBackup] = useState<BackupFile | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      if (error) clearError();
    };
  }, [error, clearError]);

  const loadBackups = async () => {
    try {
      await getBackupList();
    } catch (err) {
      // Error handled by store
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup();
      success('Backup Created', `Backup created: ${result.filename}`);
      await loadBackups(); // Refresh the list
    } catch (err: any) {
      toastError('Backup Failed', err.response?.data?.message || 'Failed to create backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      toastError('No file selected', 'Please select a backup file');
      return;
    }
    
    // Validate file type
    const validExtensions = ['.sql', '.zip', '.backup', '.json'];
    const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toastError('Invalid File', 'Please select a valid backup file (.sql, .zip, .backup, .json)');
      return;
    }

    // Validate file size (max 100MB)
    if (selectedFile.size > 100 * 1024 * 1024) {
      toastError('File Too Large', 'Backup file must be smaller than 100MB');
      return;
    }

    try {
      await restoreBackup(selectedFile);
      success('Backup Restored', 'Database restored successfully');
      setSelectedFile(null);
      await loadBackups();
    } catch (err: any) {
      toastError('Restore Failed', err.response?.data?.message || 'Failed to restore backup');
    }
  };

  // ✅ FIXED: Enhanced download function with proper error handling
  const handleDownloadBackup = async (backup: BackupFile) => {
    setDownloadingBackup(backup.filename);
    try {
      console.log('Starting download for:', backup.filename);
      
      await downloadBackup(backup.filename);
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
      await deleteBackup(deletingBackup.filename);
      success('Backup Deleted', `${deletingBackup.filename} has been deleted`);
      setDeletingBackup(null);
      await loadBackups();
    } catch (err: any) {
      toastError('Delete Failed', err.response?.data?.message || 'Failed to delete backup');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2.5 mb-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Backup & Restore</h3>
        </div>
        <p className="text-gray-500 text-sm">Create backups and restore your system data.</p>
      </div>

      {/* Backup Actions */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleCreateBackup} 
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Create Backup
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium">
            <Upload className="w-4 h-4" />
            Select Backup File
            <input 
              type="file" 
              accept=".sql,.zip,.backup,.json" 
              onChange={handleFileSelect} 
              className="hidden" 
            />
          </label>
          
          <button 
            onClick={handleRestoreBackup} 
            disabled={isLoading || !selectedFile}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-600 hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            Restore Backup
          </button>
          
          <button 
            onClick={loadBackups} 
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {selectedFile && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Selected File:</p>
                <p className="text-sm text-blue-700">{selectedFile.name}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backup List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Available Backups</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {!backups || backups.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No backups found</p>
              <button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white disabled:opacity-50 text-sm font-medium"
              >
                Create Your First Backup
              </button>
            </div>
          ) : (
            (Array.isArray(backups) ? backups : []).map(backup => (
              <div key={backup.filename} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {backup.filename}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(backup.date)}
                        </span>
                        {backup.size && (
                          <span className="text-xs text-gray-500">
                            Size: {backup.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownloadBackup(backup)}
                    disabled={isLoading || downloadingBackup === backup.filename}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    title="Download Backup"
                  >
                    {downloadingBackup === backup.filename ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeletingBackup(backup)}
                    disabled={isLoading}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg disabled:opacity-50"
                    title="Delete Backup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Backup</h3>
                <p className="text-gray-500 text-sm">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Are you sure you want to delete <strong className="font-semibold text-gray-900">{deletingBackup.filename}</strong>? 
              This backup file will be permanently removed.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingBackup(null)}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBackup}
                disabled={isLoading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-600 hover:text-white disabled:opacity-50 text-sm font-medium"
              >
                {isLoading ? 'Deleting...' : 'Delete Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}