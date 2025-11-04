// src/routes/backupRoutes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, requireAdmin } from '../middleware/authMiddleware';
import {
  createBackup,
  restoreBackup,
  getBackupList,
  downloadBackup,
  deleteBackup
} from '../controllers/backupController';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backups/');
  },
  filename: (req, file, cb) => {
    cb(null, `restore-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.backup')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON and backup files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Routes - All backup operations require admin role
router.post('/create', protect, requireAdmin, createBackup);
router.post('/restore', protect, requireAdmin, upload.single('backupFile'), restoreBackup);
router.get('/list', protect, requireAdmin, getBackupList);
router.get('/download/:filename', protect, requireAdmin, downloadBackup);
router.delete('/:filename', protect, requireAdmin, deleteBackup);

export default router;
