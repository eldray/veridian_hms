import { PrismaClient, AuditAction } from '@prisma/client';
import { IBackupResult, IBackupListResponse } from './BackupTypes';
import fs from 'fs/promises';
import path from 'path';

export class BackupRepository {
  private prisma: PrismaClient;
  private backupDir: string;
  private maxBackups: number = 50;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  async ensureBackupDir(): Promise<void> {
    try { 
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async getBackupList(page: number = 1, limit: number = 50): Promise<{ backups: IBackupListResponse[]; total: number }> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups: IBackupListResponse[] = [];

      for (const file of files) {
        // ✅ FIXED: Accept both .backup (custom format) and .sql (plain text)
        if (file.endsWith('.backup') || file.endsWith('.sql')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          backups.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }

      const sortedBackups = backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = sortedBackups.length;
      const start = (page - 1) * limit;
      const paginatedBackups = sortedBackups.slice(start, start + limit);

      return { backups: paginatedBackups, total };
    } catch (error) {
      console.error('Error reading backup directory:', error);
      return { backups: [], total: 0 };
    }
  }

  async deleteBackupFile(filename: string): Promise<void> {
    const filePath = path.join(this.backupDir, filename);
    await fs.access(filePath);
    await fs.unlink(filePath);
  }

  async deleteUploadedFile(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Could not delete uploaded file: ${filePath}`);
    }
  }

  async saveBackupResult(result: IBackupResult, userId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: 'Backup',
          entityId: result.filename,
          action: 'create' as AuditAction, // ✅ Safely cast to Prisma Enum
          performedById: userId,
          metadata: { filename: result.filename, size: result.size, path: result.path, timestamp: result.createdAt }
        }
      });
    } catch (error) {
      console.error('Failed to log backup to audit trail:', error);
    }
  }

  async logRestoreOperation(filename: string, userId: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: 'Backup',
          entityId: filename,
          action: (success ? 'update' : 'create') as AuditAction,
          performedById: userId,
          metadata: { filename, success, errorMessage, timestamp: new Date().toISOString() }
        }
      });
    } catch (error) {
      console.error('Failed to log restore operation:', error);
    }
  }

  async getBackupFilePath(filename: string): Promise<string> {
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(this.backupDir, decodedFilename);
    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      throw new Error(`Backup file '${decodedFilename}' not found`);
    }
  }

  async backupExists(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.backupDir, decodeURIComponent(filename));
      await fs.access(filePath);
      return true;
    } catch { return false; }
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.backup') || file.endsWith('.sql'));
      
      if (backupFiles.length > this.maxBackups) {
        const backupsWithStats = await Promise.all(
          backupFiles.map(async (file) => {
            const stats = await fs.stat(path.join(this.backupDir, file));
            return { filename: file, birthtime: stats.birthtime };
          })
        );
        
        backupsWithStats.sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime());
        const toDelete = backupsWithStats.slice(0, backupFiles.length - this.maxBackups);
        
        for (const backup of toDelete) {
          await this.deleteBackupFile(backup.filename);
        }
      }
    } catch (error) {
      console.error('Error during backup cleanup:', error);
    }
  }

  async getTotalBackupSize(): Promise<number> {
    try {
      const files = await fs.readdir(this.backupDir);
      let totalSize = 0;
      for (const file of files) {
        if (file.endsWith('.backup') || file.endsWith('.sql')) {
          const stats = await fs.stat(path.join(this.backupDir, file));
          totalSize += stats.size;
        }
      }
      return totalSize;
    } catch { return 0; }
  }
}