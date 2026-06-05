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
  private pgBinPath: string;

  constructor() {
    this.backupRepository = new BackupRepository();
    this.backupDir = path.join(process.cwd(), 'backups');
    // ✅ Set PostgreSQL bin path
    this.pgBinPath = 'C:\\Program Files\\PostgreSQL\\16\\bin';
  }

  private validateDatabaseUrl(): URL {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    
    try {
      return new URL(dbUrl);
    } catch (error) {
      throw new Error('Invalid DATABASE_URL format');
    }
  }

  private async checkCommandExists(command: string): Promise<boolean> {
    try {
      const { stdout } = await execPromise(`${command} --version`);
      return true;
    } catch {
      return false;
    }
  }

  async createBackup(userId: string): Promise<IBackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.backup`;  // Changed extension
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

      const pgDumpPath = path.join(this.pgBinPath, 'pg_dump.exe');
      
      try {
        await fs.access(pgDumpPath);
      } catch {
        throw new Error(`pg_dump not found at: ${pgDumpPath}`);
      }
      
      // ✅ Use custom format but with .backup extension
      // pg_restore can restore this format
      const command = `"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${filePath}" --clean --if-exists --no-owner --no-privileges --format=custom`;
      
      console.log(`📦 Running pg_dump from: ${pgDumpPath}`);
      console.log(`📦 Backing up database: ${dbName}`);
      
      const { stdout, stderr } = await execPromise(command, { env });
      
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING')) {
        console.warn('pg_dump warnings:', stderr);
      }

      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        throw new Error('Backup file is empty - backup failed');
      }

      const result: IBackupResult = {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };

      await this.backupRepository.saveBackupResult(result, userId);
      await this.backupRepository.cleanupOldBackups();

      console.log(`✅ Backup created successfully: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return result;
    } catch (error: any) {
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch {
        // File doesn't exist or can't be deleted
      }
      
      console.error(`❌ Backup failed: ${error.message}`);
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

      // Verify the backup file is valid
      const stats = await fs.stat(backupFilePath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      const env = { ...process.env, PGPASSWORD: password };

      // ✅ Use pg_restore for custom format backups
      const pgRestorePath = path.join(this.pgBinPath, 'pg_restore.exe');
      
      // Check if pg_restore exists
      try {
        await fs.access(pgRestorePath);
      } catch {
        throw new Error(`pg_restore not found at: ${pgRestorePath}. Please verify PostgreSQL installation.`);
      }
      
      // ✅ Use pg_restore command for custom-format backups
      const command = `"${pgRestorePath}" -h ${host} -p ${port} -U ${user} -d ${dbName} --clean --if-exists --no-owner --no-privileges "${backupFilePath}"`;
      
      console.log(`🔄 Running pg_restore from: ${pgRestorePath}`);
      console.log(`🔄 Restoring to database: ${dbName}`);
      console.log(`🔄 Backup file: ${backupFilePath}`);
      
      const { stdout, stderr } = await execPromise(command, { env });
      
      // Log any output for debugging
      if (stdout) {
        console.log('pg_restore stdout:', stdout);
      }
      if (stderr && !stderr.includes('WARNING')) {
        console.log('pg_restore stderr:', stderr);
      }

      // Log successful restore to audit trail
      const filename = path.basename(backupFilePath);
      await this.backupRepository.logRestoreOperation(filename, userId, true);

      // Clean up uploaded file
      await this.backupRepository.deleteUploadedFile(backupFilePath);

      console.log(`✅ Backup restored successfully from: ${filename}`);
      return true;
    } catch (error: any) {
      const filename = path.basename(backupFilePath);
      console.error(`❌ Restore error details:`, error.message);
      if (error.stderr) {
        console.error('pg_restore stderr output:', error.stderr);
      }
      if (error.stdout) {
        console.error('pg_restore stdout output:', error.stdout);
      }
      await this.backupRepository.logRestoreOperation(filename, userId, false, error.message);
      await this.backupRepository.deleteUploadedFile(backupFilePath);
      throw new Error(`Database restore failed: ${error.message}`);
    }
  }

  async getBackupList(page: number = 1, limit: number = 50): Promise<{ backups: IBackupListResponse[]; pagination: any }> {
    const result = await this.backupRepository.getBackupList(page, limit);
    const totalSize = await this.backupRepository.getTotalBackupSize();
    
    return {
      backups: result.backups,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
        totalSize: totalSize,
        totalSizeFormatted: this.formatBytes(totalSize)
      }
    };
  }

  async getBackupFilePath(filename: string): Promise<string> {
    // Decode the filename in case it was URL encoded
    const decodedFilename = decodeURIComponent(filename);
    
    if (!decodedFilename || decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
      throw new Error('Invalid filename format');
    }
    
    if (!decodedFilename.startsWith('backup-') || !decodedFilename.endsWith('.sql')) {
      throw new Error('Invalid backup file format');
    }
    
    const exists = await this.backupRepository.backupExists(decodedFilename);
    if (!exists) {
      throw new Error(`Backup file '${decodedFilename}' not found`);
    }
    return await this.backupRepository.getBackupFilePath(decodedFilename);
  }

  async deleteBackup(filename: string): Promise<boolean> {
    const decodedFilename = decodeURIComponent(filename);
    
    if (!decodedFilename.startsWith('backup-') || !decodedFilename.endsWith('.sql')) {
      throw new Error('Invalid backup filename format');
    }
    
    if (decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
      throw new Error('Invalid filename format');
    }
    
    const exists = await this.backupRepository.backupExists(decodedFilename);
    if (!exists) {
      throw new Error(`Backup file '${decodedFilename}' not found`);
    }
    
    await this.backupRepository.deleteBackupFile(decodedFilename);
    console.log(`🗑️ Backup deleted: ${decodedFilename}`);
    return true;
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    totalSizeFormatted: string;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    averageSize: number;
  }> {
    const result = await this.backupRepository.getBackupList(1, 1000);
    
    if (result.backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        totalSizeFormatted: '0 B',
        oldestBackup: null,
        newestBackup: null,
        averageSize: 0
      };
    }
    
    const totalSize = result.backups.reduce((sum, backup) => sum + backup.size, 0);
    const oldestBackup = result.backups[result.backups.length - 1]?.createdAt || null;
    const newestBackup = result.backups[0]?.createdAt || null;
    
    return {
      totalBackups: result.total,
      totalSize: totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      oldestBackup: oldestBackup,
      newestBackup: newestBackup,
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