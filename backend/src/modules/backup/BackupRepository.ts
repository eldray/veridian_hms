// src/modules/backup/BackupRepository.ts
import { IBackup, IBackupResult, IBackupListResponse } from './BackupTypes';
import fs from 'fs/promises';
import path from 'path';

export class BackupRepository {
  private backupDir: string;

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

  async getBackupFilePath(filename: string): Promise<string> {
    const filePath = path.join(this.backupDir, filename);
    await fs.access(filePath);
    return filePath;
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

  async saveBackupResult(result: IBackupResult): Promise<void> {
    // Backup results are saved to filesystem by pg_dump
    // This method can be used for logging to database if needed
    console.log(`Backup saved: ${result.filename} (${result.size} bytes)`);
  }

  async getBackupStats(filePath: string) {
    return await fs.stat(filePath);
  }

  async backupExists(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.backupDir, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}