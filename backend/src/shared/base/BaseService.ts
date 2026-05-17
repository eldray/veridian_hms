/**
 * Base Service for Enterprise Architecture
 * Provides common service layer functionality
 */

import { logger } from '../../utils/logger';

export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Log info message
   */
  protected logInfo(message: string, context?: Record<string, any>): void {
    logger.info(message, { service: this.serviceName, ...context });
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: Error, context?: Record<string, any>): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    logger.error(errorMessage, { 
      service: this.serviceName, 
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      ...context 
    });
  }

  /**
   * Log warning message
   */
  protected logWarn(message: string, context?: Record<string, any>): void {
    logger.warn(message, { service: this.serviceName, ...context });
  }

  /**
   * Log debug message
   */
  protected logDebug(message: string, context?: Record<string, any>): void {
    logger.debug(message, { service: this.serviceName, ...context });
  }
}