/**
 * Application Configuration
 * Centralized configuration for all hardcoded values and system constants
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Financial Settings
  financial: {
    VAT_RATE: parseFloat(process.env.VAT_RATE || '0'), // Default 0% - configurable via env
    DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'GHS',
    TAX_ENABLED: process.env.TAX_ENABLED === 'true',
  },

  // Pagination Defaults
  pagination: {
    DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
    MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100'),
    MIN_PAGE_SIZE: parseInt(process.env.MIN_PAGE_SIZE || '10'),
  },

  // Rate Limiting
  rateLimit: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    AUTH_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
    AUTH_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
  },

  // Security
  security: {
    JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
  },

  // File Upload
  upload: {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    ALLOWED_MIME_TYPES: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  },

  // Database
  database: {
    POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || '10'),
    CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
  },

  // Application
  app: {
    NAME: process.env.APP_NAME || 'Medicare Hospital Management System',
    VERSION: process.env.APP_VERSION || '1.0.0',
    ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000'),
  },

  // Offline Mode
  offline: {
    CACHE_TTL: parseInt(process.env.OFFLINE_CACHE_TTL || '86400000'), // 24 hours
    SYNC_INTERVAL: parseInt(process.env.OFFLINE_SYNC_INTERVAL || '300000'), // 5 minutes
    MAX_QUEUE_SIZE: parseInt(process.env.OFFLINE_MAX_QUEUE_SIZE || '1000'),
  },

  // Reporting
  reporting: {
    DEFAULT_DATE_FORMAT: process.env.REPORT_DATE_FORMAT || 'YYYY-MM-DD',
    EXPORT_FORMATS: (process.env.EXPORT_FORMATS || 'pdf,csv,excel').split(','),
    MAX_REPORT_RANGE_DAYS: parseInt(process.env.MAX_REPORT_RANGE_DAYS || '365'),
  },

  // Notification
  notification: {
    EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
    SMS_ENABLED: process.env.SMS_ENABLED === 'true',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
    SMS_PROVIDER: process.env.SMS_PROVIDER,
  },

  // Hubtel (SMS + WhatsApp provider)
  hubtel: {
    CLIENT_ID: process.env.HUBTEL_CLIENT_ID || '',
    CLIENT_SECRET: process.env.HUBTEL_CLIENT_SECRET || '',
    SENDER_ID: process.env.HUBTEL_SENDER_ID || '',
    SMS_URL: process.env.HUBTEL_SMS_URL || 'https://sms.hubtel.com/v1/messages/send',
    // WhatsApp is sent via Hubtel's messaging API; requires a provisioned WhatsApp
    // Business number and Meta-approved templates on the Hubtel side.
    WHATSAPP_URL: process.env.HUBTEL_WHATSAPP_URL || '',
    WHATSAPP_FROM: process.env.HUBTEL_WHATSAPP_FROM || '',
    // Master switch: when false, messages are queued (PENDING) but not dispatched.
    ENABLED: process.env.HUBTEL_ENABLED === 'true',
  },

  // Backup
  backup: {
    ENABLED: process.env.BACKUP_ENABLED === 'true',
    SCHEDULE: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    BACKUP_DIR: process.env.BACKUP_DIR || './backups',
  },
};

// Helper to get nested config values
export const getConfig = <T>(path: string, defaultValue?: T): T => {
  const keys = path.split('.');
  let value: any = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue as T;
    }
  }

  return value as T;
};

// Validate critical configuration on startup
export const validateConfig = (): void => {
  const errors: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }

  if (config.financial.VAT_RATE < 0 || config.financial.VAT_RATE > 1) {
    errors.push('VAT_RATE must be between 0 and 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
};

export default config;
