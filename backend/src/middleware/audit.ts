import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AuditAction } from '@prisma/client';
import { logger } from '../utils/logger';
import { appendAuditLog } from '../services/auditChain';

/** Record patient-record reads without copying patient data or search terms into the audit log. */
export const auditPatientAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as { id?: string } | undefined;
  if (!user?.id || req.method !== 'GET') return next();

  // Never store an NHIS number or free-text search term in the audit record.
  const entityId = typeof req.params.id === 'string'
    ? req.params.id
    : (req.params.nhisNumber ? 'nhis_lookup' : 'patient_collection');

  res.once('finish', () => {
    void appendAuditLog(prisma, {
      entityType: 'Patient',
      entityId,
      action: 'view',
      performedById: user.id!,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
      metadata: {
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
      },
    }).catch((error) => {
      logger.error('Failed to record patient access audit event', {
        userId: user.id,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        error,
      });
    });
  });

  next();
};

import prisma from '../core/database/prisma.client';

/** Audit reads and explicit exports from sensitive clinical and financial routers. */
export const auditSensitiveAccess = (entityType: string) => (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as { id?: string } | undefined;
  const isExportPath = /(?:^|\\/)(?:export|download|print|xml)(?:\\/|$)/i.test(req.path);
  const isExport = isExportPath && (req.method === 'GET' || req.method === 'POST');
  if (!user?.id || (req.method !== 'GET' && !isExport)) return next();

  res.once('finish', () => {
    const params = req.params || {};
    const entityId = params.id || params.patientId || params.attendanceId || params.claimId || params.admissionId || 'collection';
    const route = req.route?.path || req.path;
    void appendAuditLog(prisma, {
      entityType,
      entityId: String(entityId),
      action: isExport ? 'export' : 'view',
      performedById: user.id!,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
      metadata: { method: req.method, route, statusCode: res.statusCode },
    }).catch((error) => {
      logger.error('Failed to record sensitive access audit event', { userId: user.id, entityType, route, statusCode: res.statusCode, error });
    });
  });
  next();
};

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
  // performedById must be a real user (foreign key); skip silently instead of failing with 'system'
  if (!data.performedById) return;
  try {
    await appendAuditLog(prisma, {
      entityType: data.entityType, entityId: data.entityId, action: data.action,
      performedById: data.performedById, ipAddress: data.ipAddress,
      previousState: data.previousState || null, newState: data.newState || null,
      metadata: data.metadata || {}
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