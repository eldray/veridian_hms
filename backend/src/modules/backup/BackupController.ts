// src/modules/backup/BackupController.ts
import { Request, Response } from 'express';
import { BackupService } from './BackupService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class BackupController {
  private backupService: BackupService;

  constructor() {
    this.backupService = new BackupService();
  }

  createBackup = async (req: AuthRequest, res: Response) => {
    try {
      console.log('📦 Creating database backup...');
      const result = await this.backupService.createBackup();

      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          filename: result.filename,
          size: result.size,
          createdAt: result.createdAt
        }
      });
    } catch (error: any) {
      console.error('❌ Backup creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create backup',
        error: error.message
      });
    }
  };

  restoreBackup = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No backup file provided'
        });
      }

      // Validate file extension
      if (!req.file.originalname.endsWith('.sql')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid backup file. Only .sql files are supported'
        });
      }

      console.log(`🔄 Restoring backup from: ${req.file.originalname}`);
      await this.backupService.restoreBackup(req.file.path);

      res.json({
        success: true,
        message: 'Backup restored successfully'
      });
    } catch (error: any) {
      console.error('❌ Backup restoration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore backup',
        error: error.message
      });
    }
  };

  getBackupList = async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '50' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const result = await this.backupService.getBackupList(pageNum, limitNum);

      res.json({
        success: true,
        data: result.backups,
        pagination: result.pagination,
        message: 'Backup list retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Backup list error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get backup list',
        error: error.message
      });
    }
  };

  downloadBackup = async (req: AuthRequest, res: Response) => {
    try {
      const { filename } = req.params;

      // Validate filename for security
      if (!filename || filename.includes('..') || !filename.endsWith('.sql')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      const filePath = await this.backupService.getBackupFilePath(filename);

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to download backup'
            });
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Backup download error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Backup file not found'
      });
    }
  };

  deleteBackup = async (req: AuthRequest, res: Response) => {
    try {
      const { filename } = req.params;

      // Validate filename for security
      if (!filename || filename.includes('..') || !filename.endsWith('.sql')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      await this.backupService.deleteBackup(filename);

      res.json({
        success: true,
        message: 'Backup deleted successfully'
      });
    } catch (error: any) {
      console.error('❌ Backup deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete backup',
        error: error.message
      });
    }
  };
}