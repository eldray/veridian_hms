import api from './api';

export const createBackup = async () => {
  const response = await api.post('/backup/create');
  return response.data;
};

export const restoreBackup = async (backupFile) => {
  const formData = new FormData();
  formData.append('backupFile', backupFile);
  
  const response = await api.post('/backup/restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getBackupList = async () => {
  const response = await api.get('/backup/list');
  return response.data.backups;
};

export const downloadBackup = async (filename) => {
  const response = await api.get(`/backup/download/${filename}`, {
    responseType: 'blob'
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteBackup = async (filename) => {
  const response = await api.delete(`/backup/${filename}`);
  return response.data;
};
