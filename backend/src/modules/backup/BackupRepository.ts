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

  async getBackupList(): Promise<IBackupListResponse[]> {
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

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  async saveBackupResult(result: IBackupResult): Promise<void> {
    // Backup results are saved to filesystem by pg_dump
    // This method can be used for logging to database if needed
  }

  async getBackupStats(filePath: string) {
    return await fs.stat(filePath);
  }
}
