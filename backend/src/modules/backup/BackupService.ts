import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { BackupRepository } from './BackupRepository';
import { IBackupResult, IBackupListResponse } from './BackupTypes';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';

const execPromise = util.promisify(exec);

export class BackupService extends BaseService {
  private backupRepository: BackupRepository;
  private backupDir: string;

  constructor(prisma: PrismaClient) {
    super('BackupService');
    this.backupRepository = new BackupRepository(prisma);
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  private validateDatabaseUrl(): URL {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL is not defined');
    try { return new URL(dbUrl); } catch { throw new Error('Invalid DATABASE_URL format'); }
  }

  async createBackup(userId: string): Promise<IBackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.backup`; // ✅ Custom format uses .backup
    const filePath = path.join(this.backupDir, filename);

    await this.backupRepository.ensureBackupDir();

    try {
      const dbUrl = this.validateDatabaseUrl();
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const dbName = dbUrl.pathname.substring(1);
      const user = dbUrl.username;
      const password = dbUrl.password;

      const env = { ...process.env, PGPASSWORD: password };

      // ✅ FIXED: Cross-platform command resolution (works on Linux/Docker/Windows)
      const pgDumpCmd = process.env.PG_DUMP_PATH || 'pg_dump';
      
      const command = `"${pgDumpCmd}" -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${filePath}" --clean --if-exists --no-owner --no-privileges --format=custom`;
      
      this.logInfo('Running pg_dump', { dbName });
      const { stderr } = await execPromise(command, { env });
      
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING')) {
        this.logWarn('pg_dump warnings', { stderr });
      }

      const stats = await fs.stat(filePath);
      if (stats.size === 0) throw new Error('Backup file is empty - backup failed');

      const result: IBackupResult = { filename, path: filePath, size: stats.size, createdAt: new Date().toISOString() };

      await this.backupRepository.saveBackupResult(result, userId);
      await this.backupRepository.cleanupOldBackups();

      this.logInfo('Backup created successfully', { filename, sizeMB: (stats.size / 1024 / 1024).toFixed(2) });
      return result;
    } catch (error: any) {
      try { await fs.unlink(filePath); } catch {}
      this.logError('Backup failed', error);
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  async restoreBackup(backupFilePath: string, userId: string): Promise<boolean> {
    try {
      const dbUrl = this.validateDatabaseUrl();
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const dbName = dbUrl.pathname.substring(1);
      const user = dbUrl.username;
      const password = dbUrl.password;

      const stats = await fs.stat(backupFilePath);
      if (stats.size === 0) throw new Error('Backup file is empty');

      const env = { ...process.env, PGPASSWORD: password };

      // ✅ FIXED: Cross-platform command resolution
      const pgRestoreCmd = process.env.PG_RESTORE_PATH || 'pg_restore';
      const command = `"${pgRestoreCmd}" -h ${host} -p ${port} -U ${user} -d ${dbName} --clean --if-exists --no-owner --no-privileges "${backupFilePath}"`;
      
      this.logInfo('Running pg_restore', { dbName });
      await execPromise(command, { env });

      const filename = path.basename(backupFilePath);
      await this.backupRepository.logRestoreOperation(filename, userId, true);
      await this.backupRepository.deleteUploadedFile(backupFilePath);

      this.logInfo('Backup restored successfully', { filename });
      return true;
    } catch (error: any) {
      const filename = path.basename(backupFilePath);
      this.logError('Restore failed', error);
      await this.backupRepository.logRestoreOperation(filename, userId, false, error.message);
      await this.backupRepository.deleteUploadedFile(backupFilePath);
      throw new Error(`Database restore failed: ${error.message}`);
    }
  }

  async getBackupList(page: number = 1, limit: number = 50) {
    const result = await this.backupRepository.getBackupList(page, limit);
    const totalSize = await this.backupRepository.getTotalBackupSize();
    
    return {
      backups: result.backups,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit), totalSize, totalSizeFormatted: this.formatBytes(totalSize) }
    };
  }

  async getBackupFilePath(filename: string): Promise<string> {
    const decoded = decodeURIComponent(filename);
    if (!decoded.startsWith('backup-') || (!decoded.endsWith('.sql') && !decoded.endsWith('.backup'))) {
      throw new Error('Invalid backup file format');
    }
    return this.backupRepository.getBackupFilePath(decoded);
  }

  async deleteBackup(filename: string): Promise<boolean> {
    const decoded = decodeURIComponent(filename);
    if (!decoded.startsWith('backup-') || (!decoded.endsWith('.sql') && !decoded.endsWith('.backup'))) {
      throw new Error('Invalid backup filename format');
    }
    await this.backupRepository.deleteBackupFile(decoded);
    return true;
  }

  async getBackupStats() {
    const result = await this.backupRepository.getBackupList(1, 1000);
    if (result.backups.length === 0) return { totalBackups: 0, totalSize: 0, totalSizeFormatted: '0 B', oldestBackup: null, newestBackup: null, averageSize: 0 };
    
    const totalSize = result.backups.reduce((sum, b) => sum + b.size, 0);
    return {
      totalBackups: result.total, totalSize, totalSizeFormatted: this.formatBytes(totalSize),
      oldestBackup: result.backups[result.backups.length - 1]?.createdAt || null,
      newestBackup: result.backups[0]?.createdAt || null,
      averageSize: totalSize / result.total
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}