import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AuditAction } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AuditLogOptions {
  entityType: string;
  action: AuditAction;
  metadata?: Record<string, any>;
  capturePreviousState?: boolean;
  captureNewState?: boolean;
}

// Helper to capture entity state
async function captureEntityState(entityType: string, entityId: string): Promise<any> {
  const modelMap: Record<string, string> = {
    'Bill': 'bill', 'Payment': 'payment', 'BillLineItem': 'billLineItem',
    'InsuranceClaim': 'insuranceClaim', 'PatientWaiver': 'patientWaiver',
    'Attendance': 'attendance', 'Admission': 'admission', 'Ward': 'ward'
  };
  const modelName = modelMap[entityType] || entityType.toLowerCase();
  
  try {
    // @ts-ignore
    return await (prisma as any)[modelName].findUnique({ where: { id: entityId } });
  } catch (error) {
    logger.error(`Failed to capture state for ${entityType}/${entityId}`, { error });
    return null;
  }
}

// Helper to create audit log entry
async function createAuditLog(data: {
  entityType: string; entityId: string; action: AuditAction;
  performedById?: string; ipAddress?: string; previousState?: any;
  newState?: any; metadata?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: data.entityType, entityId: data.entityId, action: data.action,
        performedById: data.performedById || 'system', ipAddress: data.ipAddress,
        previousState: data.previousState || null, newState: data.newState || null,
        metadata: data.metadata || {}
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error });
  }
}

// Generic audit middleware for financial operations
export const auditFinancialEvent = (options: AuditLogOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const startTime = Date.now();
    let previousState: any = null;
    const entityId = (req.params.id || req.body.entityId || req.params.billId || req.params.claimId) as string;
    const user = (req as any).user;

    if (options.capturePreviousState && entityId && options.entityType) {
      previousState = await captureEntityState(options.entityType, entityId);
    }

    res.json = function(body: any) {
      const responseTime = Date.now() - startTime;
      const metadata = {
        ...options.metadata, method: req.method, url: req.originalUrl,
        responseTime, statusCode: res.statusCode, userAgent: req.headers['user-agent']
      };

      if (options.captureNewState && entityId && options.entityType && body?.success !== false) {
        captureEntityState(options.entityType, entityId)
          .then(state => createAuditLog({ ...options, entityId, performedById: user?.id, ipAddress: req.ip, previousState, newState: state, metadata }))
          .catch(err => logger.error('Failed to capture new state for audit', { error: err }));
      } else {
        createAuditLog({ ...options, entityId, performedById: user?.id, ipAddress: req.ip, previousState, newState: null, metadata })
          .catch(err => logger.error('Failed to create audit log', { error: err }));
      }
      return originalJson.call(this, body);
    };
    next();
  };
};

// Pre-configured middlewares for specific operations
export const auditBillOperation = auditFinancialEvent({ entityType: 'Bill', action: 'update', capturePreviousState: true, captureNewState: true, metadata: { operation: 'bill_update' } });
export const auditPaymentOperation = auditFinancialEvent({ entityType: 'Payment', action: 'create', capturePreviousState: false, captureNewState: true, metadata: { operation: 'payment_received' } });
export const auditVoidOperation = auditFinancialEvent({ entityType: 'BillLineItem', action: 'void', capturePreviousState: true, captureNewState: true, metadata: { operation: 'void_line_item' } });
export const auditClaimSubmission = auditFinancialEvent({ entityType: 'InsuranceClaim', action: 'submit', capturePreviousState: true, captureNewState: true, metadata: { operation: 'claim_submission' } });

// Utility functions for retrieving audit trails
export const getAuditTrail = async (entityType: string, entityId: string) => {
  return await prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { performedBy: { select: { id: true, fullName: true, username: true, role: true } } },
    orderBy: { timestamp: 'desc' }
  });
};

export const getUserAuditTrail = async (userId: string, limit = 100) => {
  return await prisma.auditLog.findMany({
    where: { performedById: userId },
    include: { performedBy: { select: { id: true, fullName: true, username: true, role: true } } },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
};