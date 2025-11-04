// src/controllers/backupController.ts
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import mongoose from 'mongoose';

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
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(this.backupDir, filename);

    try {
      // Get all collections from MongoDB
      const collections = await mongoose.connection.db.listCollections().toArray();
      const backupData: any = {};

      // Export each collection
      for (const collection of collections) {
        const collectionName = collection.name;
        if (collectionName.startsWith('system.')) continue; // Skip system collections
        
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = data;
      }

      // Add metadata
      backupData.metadata = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        database: mongoose.connection.name,
        collections: Object.keys(backupData).filter(key => key !== 'metadata')
      };

      // Write backup file
      const backupContent = JSON.stringify(backupData, null, 2);
      await fs.writeFile(filePath, backupContent, 'utf8');

      const stats = await fs.stat(filePath);

      return {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error(`Backup creation failed: ${(error as Error).message}`);
    }
  }

  async restoreBackup(backupFilePath: string) {
    try {
      // Read backup file
      const backupContent = await fs.readFile(backupFilePath, 'utf8');
      const backupData = JSON.parse(backupContent);

      // Validate backup structure
      if (!backupData.metadata || !backupData.metadata.collections) {
        throw new Error('Invalid backup file format');
      }

      // Clear existing collections (optional - you might want to merge instead)
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const collection of collections) {
        if (collection.name.startsWith('system.')) continue;
        await mongoose.connection.db.collection(collection.name).deleteMany({});
      }

      // Restore data for each collection
      for (const collectionName of backupData.metadata.collections) {
        if (collectionName === 'metadata') continue;
        
        const collectionData = backupData[collectionName];
        if (collectionData && collectionData.length > 0) {
          await mongoose.connection.db.collection(collectionName).insertMany(collectionData);
        }
      }

      // Clean up uploaded file
      await fs.unlink(backupFilePath);

      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw new Error(`Backup restoration failed: ${(error as Error).message}`);
    }
  }

  async getBackupList() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
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
    } catch (error) {
      throw new Error('Backup file not found');
    }
  }

  async deleteBackup(filename: string) {
    const filePath = path.join(this.backupDir, filename);
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      throw new Error('Backup file not found');
    }
  }

  // Alternative method using mongodump (if available)
  async createMongoDumpBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `mongodump-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      const { stdout, stderr } = await execPromise(
        `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupPath}"`
      );

      // Create a zip file of the backup
      const zipFileName = `${backupName}.zip`;
      const zipFilePath = path.join(this.backupDir, zipFileName);
      
      await execPromise(`zip -r "${zipFilePath}" "${backupPath}"`);

      // Clean up the uncompressed backup
      await fs.rm(backupPath, { recursive: true });

      const stats = await fs.stat(zipFilePath);

      return {
        filename: zipFileName,
        path: zipFilePath,
        size: stats.size,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('MongoDump backup failed:', error);
      throw new Error(`MongoDump backup failed: ${(error as Error).message}`);
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
