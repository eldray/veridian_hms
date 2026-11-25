// src/modules/backup/BackupTypes.ts

export interface IBackup {
  id?: string;
  filename: string;
  path?: string;
  size: number;
  createdAt: string | Date;
  modifiedAt?: string | Date;
  createdBy?: string;
}

export interface IBackupResult {
  filename: string;
  path: string;
  size: number;
  createdAt: string;
}

export interface ICreateBackupRequest {
  // No body needed, triggered by request
}

export interface IRestoreBackupRequest {
  file: Express.Multer.File;
}

export interface IBackupListResponse {
  filename: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface IBackupListResult {
  backups: IBackupListResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IDatabaseBackupLog {
  id: string;
  filename: string;
  size: number;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  performedById: string;
  createdAt: Date;
  restoredAt?: Date;
  restoredById?: string;
}