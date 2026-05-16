// src/modules/backup/BackupRoutes.ts
import { Router } from 'express';
import { BackupController } from './BackupController';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

export const createBackupRoutes = (): Router => {
  const router = Router();
  const backupController = new BackupController();

  // Create a new backup
  router.post('/', backupController.createBackup);

  // Restore from backup (file upload required)
  router.post('/restore', upload.single('backup'), backupController.restoreBackup);

  // Get list of all backups
  router.get('/', backupController.getBackupList);

  // Download a specific backup
  router.get('/download/:filename', backupController.downloadBackup);

  // Delete a backup
  router.delete('/:filename', backupController.deleteBackup);

  return router;
};
