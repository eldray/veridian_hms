// src/modules/backup/BackupService.ts
import { BackupRepository } from './BackupRepository';
import { IBackupResult, IBackupListResponse } from './BackupTypes';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';

const execPromise = util.promisify(exec);

export class BackupService {
  private backupRepository: BackupRepository;
  private backupDir: string;

  constructor() {
    this.backupRepository = new BackupRepository();
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  async createBackup(): Promise<IBackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    await this.backupRepository.ensureBackupDir();

    // Extract DB URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment');
    }

    try {
      // Parse DATABASE_URL to extract connection params
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const dbName = url.pathname.substring(1);
      const user = url.username;
      const password = url.password;

      // Set PGPASSWORD for pg_dump
      const env = { ...process.env, PGPASSWORD: password };

      // Run pg_dump
      const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${filePath}" --clean --if-exists --no-owner --no-privileges`;
      
      console.log(`📦 Running pg_dump command for database: ${dbName}`);
      const { stdout, stderr } = await execPromise(command, { env });
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('pg_dump warnings:', stderr);
      }

      const stats = await this.backupRepository.getBackupStats(filePath);

      const result: IBackupResult = {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };

      await this.backupRepository.saveBackupResult(result);

      console.log(`✅ Backup created successfully: ${filename} (${stats.size} bytes)`);
      return result;
    } catch (error: any) {
      // Clean up partial backup file if it exists
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch {
        // File doesn't exist or can't be deleted
      }
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  async restoreBackup(backupFilePath: string): Promise<boolean> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment');
    }

    try {
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const dbName = url.pathname.substring(1);
      const user = url.username;
      const password = url.password;

      const env = { ...process.env, PGPASSWORD: password };

      // Restore using psql
      const command = `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${backupFilePath}" --set ON_ERROR_STOP=on`;
      
      console.log(`🔄 Running psql restore command for database: ${dbName}`);
      const { stdout, stderr } = await execPromise(command, { env });
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('psql warnings:', stderr);
      }

      // Clean up uploaded file
      await this.backupRepository.deleteUploadedFile(backupFilePath);

      console.log(`✅ Backup restored successfully`);
      return true;
    } catch (error: any) {
      // Try to clean up uploaded file even on failure
      await this.backupRepository.deleteUploadedFile(backupFilePath);
      throw new Error(`Database restore failed: ${error.message}`);
    }
  }

  async getBackupList(page: number = 1, limit: number = 50): Promise<{ backups: IBackupListResponse[]; pagination: any }> {
    const result = await this.backupRepository.getBackupList(page, limit);
    
    return {
      backups: result.backups,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    };
  }

  async getBackupFilePath(filename: string): Promise<string> {
    const exists = await this.backupRepository.backupExists(filename);
    if (!exists) {
      throw new Error(`Backup file '${filename}' not found`);
    }
    return await this.backupRepository.getBackupFilePath(filename);
  }

  async deleteBackup(filename: string): Promise<boolean> {
    const exists = await this.backupRepository.backupExists(filename);
    if (!exists) {
      throw new Error(`Backup file '${filename}' not found`);
    }
    await this.backupRepository.deleteBackupFile(filename);
    console.log(`🗑️ Backup deleted: ${filename}`);
    return true;
  }
}