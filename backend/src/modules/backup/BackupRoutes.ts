import { Router } from 'express';
import { UserRole } from '@prisma/client'; // ✅ Import UserRole
import { backupController } from './BackupController';
import { protect, requireRole, requireSuperAdmin } from '../../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `backup-restore-${Date.now()}-${Math.round(Math.random() * 1E9)}.sql`)
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().match(/\.(sql|backup|dump)$/)) cb(null, true);
    else cb(new Error('Only .sql, .backup, or .dump files are allowed') as any, false);
  }
});

export function createBackupRoutes(): Router {
  const router = Router();

  router.use(protect);
  
  // ✅ FIXED: Explicitly type the array to prevent TypeScript underlines
  const adminRoles: UserRole[] = ['admin'];
  router.use(requireRole(adminRoles));

  router.post('/', backupController.createBackup);
  // Database restore can overwrite live hospital data: reserve this action for super admins.
  router.post('/restore', requireSuperAdmin, upload.single('backup'), backupController.restoreBackup);
  router.get('/', backupController.getBackupList);
  router.get('/stats', backupController.getBackupStats);
  router.get('/download/:filename', backupController.downloadBackup);
  router.delete('/:filename', backupController.deleteBackup);

  return router;
}