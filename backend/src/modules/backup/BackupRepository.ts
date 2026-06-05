// src/modules/backup/BackupRepository.ts
import { PrismaClient, AuditAction } from '@prisma/client';

import { IBackup, IBackupResult, IBackupListResponse, IDatabaseBackupLog } from './BackupTypes';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export class BackupRepository {
  private backupDir: string;
  private maxBackups: number = 50; // Maximum number of backups to keep

  constructor() {
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
        if (file.endsWith('.sql')) {
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

      // Sort by creation date (newest first)
      const sortedBackups = backups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const total = sortedBackups.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedBackups = sortedBackups.slice(start, end);

      return {
        backups: paginatedBackups,
        total
      };
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
      await prisma.auditLog.create({
        data: {
          entityType: 'Backup',
          entityId: result.filename,
          action: AuditAction.create,  // ✅ Use enum value, not string
          performedById: userId,
          metadata: {
            filename: result.filename,
            size: result.size,
            path: result.path,
            timestamp: result.createdAt
          }
        }
      });
      console.log(`📝 Backup logged to audit trail: ${result.filename}`);
    } catch (error) {
      console.error('Failed to log backup to audit trail:', error);
    }
  }

  async logRestoreOperation(filename: string, userId: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'Backup',
          entityId: filename,
          action: success ? AuditAction.update : AuditAction.create,  // ✅ Use enum value
          performedById: userId,
          metadata: {
            filename,
            success,
            errorMessage,
            timestamp: new Date().toISOString()
          }
        }
      });
      console.log(`📝 Restore operation logged to audit trail: ${filename}`);
    } catch (error) {
      console.error('Failed to log restore operation:', error);
    }
  }


  async getBackupStats(filePath: string) {
    return await fs.stat(filePath);
  }

  async getBackupFilePath(filename: string): Promise<string> {
    // Decode the filename in case it was URL encoded
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
      const decodedFilename = decodeURIComponent(filename);
      const filePath = path.join(this.backupDir, decodedFilename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql'));
      
      if (backupFiles.length > this.maxBackups) {
        // Get all backup files with their stats
        const backupsWithStats = await Promise.all(
          backupFiles.map(async (file) => {
            const filePath = path.join(this.backupDir, file);
            const stats = await fs.stat(filePath);
            return { filename: file, birthtime: stats.birthtime };
          })
        );
        
        // Sort by creation date (oldest first)
        backupsWithStats.sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime());
        
        // Delete oldest backups exceeding the limit
        const toDelete = backupsWithStats.slice(0, backupFiles.length - this.maxBackups);
        
        for (const backup of toDelete) {
          await this.deleteBackupFile(backup.filename);
          console.log(`🗑️ Auto-deleted old backup: ${backup.filename}`);
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
        if (file.endsWith('.sql')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating total backup size:', error);
      return 0;
    }
  }
}