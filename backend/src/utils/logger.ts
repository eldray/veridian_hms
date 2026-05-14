import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    
    // Error file transport
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined file transport
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Audit log transport for security events
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Helper methods for common logging scenarios
export const logAudit = (action: string, userId: string, details: any) => {
  logger.info('AUDIT_EVENT', {
    event: 'audit',
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logError = (error: Error, context: string, userId?: string) => {
  logger.error(`${context}: ${error.message}`, {
    event: 'error',
    stack: error.stack,
    userId,
    context
  });
};

export const logRequest = (method: string, path: string, statusCode: number, duration: number, userId?: string) => {
  logger.http('HTTP_REQUEST', {
    event: 'request',
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
    userId
  });
};

export const logSecurityEvent = (eventType: string, ip: string, details: any) => {
  logger.warn('SECURITY_EVENT', {
    event: 'security',
    eventType,
    ip,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Export types
export type Logger = typeof logger;
