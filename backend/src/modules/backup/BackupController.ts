// src/modules/backup/BackupController.ts
import { Request, Response } from 'express';
import { BackupService } from './BackupService';

export class BackupController {
  private backupService: BackupService;

  constructor() {
    this.backupService = new BackupService();
  }

  createBackup = async (req: Request, res: Response) => {
    try {
      const result = await this.backupService.createBackup();

      res.json({
        success: true,
        message: 'Backup created successfully',
        filename: result.filename,
        size: result.size,
        createdAt: result.createdAt
      });
    } catch (error: any) {
      console.error('Backup creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create backup',
        error: error.message
      });
    }
  };

  restoreBackup = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No backup file provided'
        });
      }

      await this.backupService.restoreBackup(req.file.path);

      res.json({
        success: true,
        message: 'Backup restored successfully'
      });
    } catch (error: any) {
      console.error('Backup restoration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore backup',
        error: error.message
      });
    }
  };

  getBackupList = async (req: Request, res: Response) => {
    try {
      const backups = await this.backupService.getBackupList();

      res.json({
        success: true,
        backups
      });
    } catch (error: any) {
      console.error('Backup list error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get backup list',
        error: error.message
      });
    }
  };

  downloadBackup = async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = await this.backupService.getBackupFilePath(filename);

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download backup'
          });
        }
      });
    } catch (error: any) {
      console.error('Backup download error:', error);
      res.status(500).json({
        success: false,
        message: 'Backup file not found',
        error: error.message
      });
    }
  };

  deleteBackup = async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      await this.backupService.deleteBackup(filename);

      res.json({
        success: true,
        message: 'Backup deleted successfully'
      });
    } catch (error: any) {
      console.error('Backup deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete backup',
        error: error.message
      });
    }
  };
}
