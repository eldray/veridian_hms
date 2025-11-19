// src/controllers/backupController.ts
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDir();
  }

  private async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    try {
      // Extract DB URL from environment
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL is not defined in environment');
      }

      // Parse DATABASE_URL to extract connection params
      // Example: postgresql://user:pass@host:port/dbname
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const dbName = url.pathname.substring(1); // remove leading '/'
      const user = url.username;
      const password = url.password;

      // Set PGPASSWORD for pg_dump (security note: avoid in prod; use .pgpass instead)
      const env = { ...process.env, PGPASSWORD: password };

      // Run pg_dump
      const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${filePath}" --clean --if-exists`;
      await execPromise(command, { env });

      const stats = await fs.stat(filePath);

      return {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Backup creation failed:', error);
      throw new Error(`Backup creation failed: ${error.message || error}`);
    }
  }

  async restoreBackup(backupFilePath: string) {
    try {
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
      await fs.unlink(backupFilePath);

      return true;
    } catch (error: any) {
      console.error('Backup restoration failed:', error);
      throw new Error(`Backup restoration failed: ${error.message || error}`);
    }
  }

  async getBackupList() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

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
    } catch (error) {
      console.error('Error getting backup list:', error);
      throw error;
    }
  }

  async getBackupFilePath(filename: string) {
    const filePath = path.join(this.backupDir, filename);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      throw new Error('Backup file not found');
    }
  }

  async deleteBackup(filename: string) {
    const filePath = path.join(this.backupDir, filename);
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      return true;
    } catch {
      throw new Error('Backup file not found');
    }
  }
}

// Controller functions
export const createBackup = async (req: Request, res: Response) => {
  try {
    const backupService = new BackupService();
    const result = await backupService.createBackup();

    res.json({
      success: true,
      message: 'Backup created successfully',
      filename: result.filename,
      size: result.size,
      createdAt: result.createdAt
    });
  } catch (error: any) {
    console.error('Backup creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No backup file provided'
      });
    }

    const backupService = new BackupService();
    await backupService.restoreBackup(req.file.path);

    res.json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error: any) {
    console.error('Backup restoration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
};

export const getBackupList = async (req: Request, res: Response) => {
  try {
    const backupService = new BackupService();
    const backups = await backupService.getBackupList();

    res.json({
      success: true,
      backups
    });
  } catch (error: any) {
    console.error('Backup list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup list',
      error: error.message
    });
  }
};

export const downloadBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backupService = new BackupService();
    const filePath = await backupService.getBackupFilePath(filename);

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download backup'
        });
      }
    });
  } catch (error: any) {
    console.error('Backup download error:', error);
    res.status(500).json({
      success: false,
      message: 'Backup file not found',
      error: error.message
    });
  }
};

export const deleteBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backupService = new BackupService();
    await backupService.deleteBackup(filename);

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error: any) {
    console.error('Backup deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
};