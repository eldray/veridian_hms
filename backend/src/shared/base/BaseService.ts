/**
 * Base Service for Enterprise Architecture
 * Provides common service layer functionality
 */

import { Logger } from '../../utils/logger';

export abstract class BaseService {
  protected logger: Logger;
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = new Logger(serviceName);
  }

  /**
   * Log info message
   */
  protected logInfo(message: string, context?: Record<string, any>): void {
    this.logger.info(message, { service: this.serviceName, ...context });
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: Error, context?: Record<string, any>): void {
    this.logger.error(message, { 
      service: this.serviceName, 
      error: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      ...context 
    });
  }

  /**
   * Log warning message
   */
  protected logWarn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, { service: this.serviceName, ...context });
  }

  /**
   * Log debug message
   */
  protected logDebug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, { service: this.serviceName, ...context });
  }
}
