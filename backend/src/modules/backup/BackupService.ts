// src/modules/backup/BackupService.ts
import { BackupRepository } from './BackupRepository';
import { IBackupResult, IBackupListResponse } from './BackupTypes';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

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
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${filePath}" --clean --if-exists`;
    await execPromise(command, { env });

    const stats = await this.backupRepository.getBackupStats(filePath);

    const result: IBackupResult = {
      filename,
      path: filePath,
      size: stats.size,
      createdAt: new Date().toISOString()
    };

    await this.backupRepository.saveBackupResult(result);

    return result;
  }

  async restoreBackup(backupFilePath: string): Promise<boolean> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment');
    }

    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const dbName = url.pathname.substring(1);
    const user = url.username;
    const password = url.password;

    const env = { ...process.env, PGPASSWORD: password };

    // Restore using psql
    const command = `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${backupFilePath}"`;
    await execPromise(command, { env });

    // Clean up uploaded file
    await this.backupRepository.deleteBackupFile(path.basename(backupFilePath));

    return true;
  }

  async getBackupList(): Promise<IBackupListResponse[]> {
    return await this.backupRepository.getBackupList();
  }

  async getBackupFilePath(filename: string): Promise<string> {
    return await this.backupRepository.getBackupFilePath(filename);
  }

  async deleteBackup(filename: string): Promise<boolean> {
    await this.backupRepository.deleteBackupFile(filename);
    return true;
  }
}
