import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { BackupService } from './BackupService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class BackupController extends BaseController {
  private backupService: BackupService;

  constructor() {
    super();
    this.backupService = new BackupService(prisma);
  }

  createBackup = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.backupService.createBackup(req.user!.id);
    return this.ok(res, {
      filename: result.filename, size: result.size,
      sizeFormatted: this.formatBytes(result.size), createdAt: result.createdAt
    }, 'Backup created successfully');
  });

  restoreBackup = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) return this.badRequest(res, 'No backup file provided');

    const validExtensions = ['.sql', '.backup', '.dump'];
    const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) return this.badRequest(res, 'Invalid backup file. Only .sql, .backup, or .dump supported');
    if (req.file.size === 0) return this.badRequest(res, 'Backup file is empty');

    // ✅ Send immediate response and continue in background
    this.ok(res, null, 'Restore started in background. This may take several minutes.');

    this.backupService.restoreBackup(req.file.path, req.user!.id)
      .catch(err => console.error('❌ Background restore failed:', err));
  });

  getBackupList = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.backupService.getBackupList(page, limit);

    const formatted = result.backups.map(b => ({
      ...b,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
      formattedDate: b.createdAt instanceof Date ? b.createdAt.toLocaleString() : new Date(b.createdAt).toLocaleString()
    }));

    return this.paginated(res, formatted, { page, limit, total: result.pagination.total }, 'Backup list retrieved');
  });

  downloadBackup = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return this.badRequest(res, 'Invalid filename');
    }

    const filePath = await this.backupService.getBackupFilePath(filename);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.download(filePath, filename, (err) => {
      if (err && !res.headersSent) {
        this.error(res, err);
      }
    });
  });

  deleteBackup = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;
    
    // ✅ FIXED: Regex now accepts both .sql and .backup
    if (!filename || filename.includes('..') || !filename.match(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.(backup|sql)$/)) {
      return this.badRequest(res, 'Invalid filename format');
    }

    await this.backupService.deleteBackup(filename);
    return this.ok(res, null, 'Backup deleted successfully');
  });

  getBackupStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.backupService.getBackupStats();
    return this.ok(res, stats, 'Backup statistics retrieved');
  });

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const backupController = new BackupController();