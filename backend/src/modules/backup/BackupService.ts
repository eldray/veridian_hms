import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { BackupRepository } from './BackupRepository';
import { IBackupResult, IBackupListResponse } from './BackupTypes';
import path from 'path';
import { execFile } from 'child_process';
import crypto from 'crypto';
import util from 'util';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

const execFilePromise = util.promisify(execFile);
const PG_OPERATION_TIMEOUT_MS = 30 * 60 * 1000;

function checksumFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

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

      // pg_dump is invoked directly with an argument array: no shell, so a
      // password or database name containing spaces/metacharacters is safe.
      const pgDumpCmd = process.env.PG_DUMP_PATH || 'pg_dump';
      const args = [
        '-h', host, '-p', port, '-U', user, '-d', dbName,
        '-f', filePath, '--format=custom', '--no-owner', '--no-privileges',
      ];

      this.logInfo('Running pg_dump', { dbName });
      let stderr = '';
      try {
        ({ stderr } = await execFilePromise(pgDumpCmd, args, {
          env,
          timeout: PG_OPERATION_TIMEOUT_MS,
          maxBuffer: 16 * 1024 * 1024,
        }));
      } catch (error: any) {
        stderr = error.stderr || '';
        if (error.code === 'ENOENT') {
          throw new Error('pg_dump was not found. Install the PostgreSQL client tools or set PG_DUMP_PATH.');
        }
        throw error;
      }
      
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING')) {
        this.logWarn('pg_dump warnings', { stderr });
      }

      const stats = await fs.stat(filePath);
      if (stats.size === 0) throw new Error('Backup file is empty - backup failed');

      const checksum = await checksumFile(filePath);
      await fs.writeFile(`${filePath}.sha256`, `${checksum}  ${filename}\n`, { mode: 0o600 });

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

      // A .sha256 sidecar is written next to backups created by this service.
      // When a dump is re-uploaded on its own there is nothing to compare; the
      // checksum is still computed so the restore log records the exact input.
      const checksum = await checksumFile(backupFilePath);
      const sidecarPath = `${backupFilePath}.sha256`;
      try {
        const expected = (await fs.readFile(sidecarPath, 'utf8')).trim().split(/\s+/)[0];
        if (expected && expected !== checksum) {
          throw new Error('Backup checksum does not match the stored .sha256 file. The dump may be corrupted.');
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }

      const env = { ...process.env, PGPASSWORD: password };
      const extension = path.extname(backupFilePath).toLowerCase();

      this.logInfo('Running database restore', { dbName, extension, checksum });
      try {
        if (extension === '.sql') {
          // Plain SQL dumps cannot be read by pg_restore.
          const psqlCmd = process.env.PG_PSQL_PATH || 'psql';
          await execFilePromise(psqlCmd, [
            '-h', host, '-p', port, '-U', user, '-d', dbName,
            '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', backupFilePath,
          ], { env, timeout: PG_OPERATION_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
        } else {
          const pgRestoreCmd = process.env.PG_RESTORE_PATH || 'pg_restore';
          await execFilePromise(pgRestoreCmd, [
            '-h', host, '-p', port, '-U', user, '-d', dbName,
            '--clean', '--if-exists', '--no-owner', '--no-privileges',
            '--single-transaction', '--exit-on-error', backupFilePath,
          ], { env, timeout: PG_OPERATION_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(
            extension === '.sql'
              ? 'psql was not found. Install the PostgreSQL client tools or set PG_PSQL_PATH.'
              : 'pg_restore was not found. Install the PostgreSQL client tools or set PG_RESTORE_PATH.',
          );
        }
        throw error;
      }

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