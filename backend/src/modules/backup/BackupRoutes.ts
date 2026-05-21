// src/modules/backup/BackupRoutes.ts
import { Router } from 'express';
import { BackupController } from './BackupController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

// Configure multer for backup uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `backup-${uniqueSuffix}.sql`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only .sql files are allowed') as any, false);
    }
  }
});

export const createBackupRoutes = (): Router => {
  const router = Router();
  const backupController = new BackupController();

  // All routes require authentication and admin role
  router.use(protect);
  router.use(requireRole(['admin']));

  // Create a new backup
  router.post('/', backupController.createBackup);

  // Restore from backup (file upload required)
  router.post('/restore', upload.single('backup'), backupController.restoreBackup);

  // Get list of all backups (with pagination)
  router.get('/', backupController.getBackupList);

  // Download a specific backup
  router.get('/download/:filename', backupController.downloadBackup);

  // Delete a backup
  router.delete('/:filename', backupController.deleteBackup);

  return router;
};