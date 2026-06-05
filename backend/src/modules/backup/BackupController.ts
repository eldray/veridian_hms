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
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      console.log('📦 Creating database backup...');
      const result = await this.backupService.createBackup(userId);

      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          filename: result.filename,
          size: result.size,
          sizeFormatted: this.formatBytes(result.size),
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
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
  
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No backup file provided'
        });
      }
  
      console.log(`🔄 Restoring backup from: ${req.file.originalname}`);
  
      const validExtensions = ['.sql', '.backup', '.dump'];
      const fileExtension = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid backup file. Only .sql, .backup, or .dump files are supported'
        });
      }
  
      if (req.file.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'Backup file is empty'
        });
      }
  
      // ✅ Send immediate response
      res.json({
        success: true,
        message: 'Restore started in background. This may take several minutes.'
      });
  
      // ✅ Continue restore in background
      this.backupService.restoreBackup(req.file.path, userId)
        .then(() => {
          console.log('✅ Background restore completed successfully');
        })
        .catch((error) => {
          console.error('❌ Background restore failed:', error);
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
  
      // Format dates for frontend
      const formattedBackups = result.backups.map(backup => ({
        ...backup,
        createdAt: backup.createdAt instanceof Date ? backup.createdAt.toISOString() : backup.createdAt,
        formattedDate: backup.createdAt instanceof Date 
          ? backup.createdAt.toLocaleString() 
          : new Date(backup.createdAt).toLocaleString()
      }));
  
      res.json({
        success: true,
        data: formattedBackups,
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

      console.log(`📥 Download requested for: ${filename}`);

      // ✅ Less strict validation - just prevent directory traversal
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      // ✅ Accept any .sql file that starts with 'backup-'
      if (!filename.startsWith('backup-') || !filename.endsWith('.sql')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid backup file format'
        });
      }

      const filePath = await this.backupService.getBackupFilePath(filename);

      // Set correct headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to download backup'
            });
          }
        } else {
          console.log(`✅ Backup downloaded: ${filename}`);
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

      console.log(`🗑️ Attempting to delete backup: ${filename}`);

      // ✅ Update the regex to match your filename format
      // Your format: backup-2026-05-31T00-25-35-991Z.sql
      // The T and Z are valid characters, and dots are in timestamp
      if (!filename || filename.includes('..') || !filename.match(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sql$/)) {
        console.log(`❌ Invalid filename format: ${filename}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid filename format'
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

  getBackupStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.backupService.getBackupStats();

      res.json({
        success: true,
        data: stats,
        message: 'Backup statistics retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ Backup stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get backup statistics',
        error: error.message
      });
    }
  };

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}