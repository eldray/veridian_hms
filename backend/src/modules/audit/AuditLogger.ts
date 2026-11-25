import { AuditAction, PrismaClient } from '@prisma/client';
import { AuditService } from './AuditService';

interface LogArgs {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
}

/**
 * Non-blocking audit logger.
 * Never throws into the caller's request — a failing audit write
 * should not crash the operation it was recording. Errors are
 * logged to stderr for later inspection.
 */
export class AuditLogger {
  private service: AuditService;

  constructor(prisma: PrismaClient) {
    this.service = new AuditService(prisma);
  }

  async log(args: LogArgs): Promise<void> {
    try {
      const metadata = {
        ...(args.metadata ?? {}),
        ...(args.userAgent ? { userAgent: args.userAgent } : {}),
      };

      await this.service.createLog({
        entityType: args.entityType,
        entityId: args.entityId,
        action: args.action,
        performedById: args.performedById,
        ipAddress: args.ipAddress ?? null,
        previousState: args.previousState ?? null,
        newState: args.newState ?? null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });
    } catch (err: any) {
      // Do not throw. Log and move on.
      // eslint-disable-next-line no-console
      console.error('[AuditLogger] failed to write audit log:', err?.message ?? err);
    }
  }
}