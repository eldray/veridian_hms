// middleware/audit.ts - Financial Event Audit Logging
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AuditAction } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Define AuthRequest locally since the types file doesn't exist
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
}

export interface AuditLogOptions {
  entityType: string;
  action: AuditAction;
  metadata?: Record<string, any>;
  capturePreviousState?: boolean;
  captureNewState?: boolean;
}

// Generic audit middleware for financial operations
export const auditFinancialEvent = (options: AuditLogOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const startTime = Date.now();
    let previousState: any = null;
    let entityId: string | null = null;

    // Extract entity ID from request params or body
    entityId = (req.params.id || req.body.entityId || req.params.billId || req.params.claimId) as string;

    // Capture previous state if requested
    if (options.capturePreviousState && entityId && options.entityType) {
      try {
        previousState = await captureEntityState(options.entityType, entityId);
      } catch (error) {
        logger.warn(`Could not capture previous state for ${options.entityType}/${entityId}`, { error });
      }
    }

    // Override res.json to capture response
    res.json = function(body: any) {
      // Log audit entry after response is sent
      const responseTime = Date.now() - startTime;

      // Capture new state if requested and response was successful
      let newState: any = null;
      if (options.captureNewState && entityId && options.entityType && body?.success !== false) {
        captureEntityState(options.entityType, entityId!)
          .then(state => {
            createAuditLog({
              entityType: options.entityType,
              entityId: entityId!,
              action: options.action,
              performedById: req.user?.id,
              ipAddress: req.ip || req.socket.remoteAddress,
              // userAgent removed - not in schema
              previousState,
              newState: state,
              metadata: {
                ...options.metadata,
                method: req.method,
                url: req.originalUrl,
                responseTime,
                statusCode: res.statusCode,
                userAgent: req.headers['user-agent'] // Store in metadata instead
              }
            }).catch(err => logger.error('Failed to create audit log with new state', { error: err }));
          })
          .catch(err => logger.error('Failed to capture new state for audit', { error: err }));
      } else {
        // Create audit log without new state
        createAuditLog({
          entityType: options.entityType,
          entityId: entityId!,
          action: options.action,
          performedById: req.user?.id,
          ipAddress: req.ip || req.socket.remoteAddress,
          // userAgent removed - not in schema
          previousState,
          newState: null,
          metadata: {
            ...options.metadata,
            method: req.method,
            url: req.originalUrl,
            responseTime,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent'] // Store in metadata instead
          }
        }).catch(err => logger.error('Failed to create audit log', { error: err }));
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

// Helper to capture entity state
async function captureEntityState(entityType: string, entityId: string): Promise<any> {
  const modelMap: Record<string, string> = {
    'Bill': 'bill',
    'Payment': 'payment',
    'BillLineItem': 'billLineItem',
    'InsuranceClaim': 'insuranceClaim',
    'PatientWaiver': 'patientWaiver',
    'Attendance': 'attendance',
    'Admission': 'admission',
    'Ward': 'ward'
  };

  const modelName = modelMap[entityType] || entityType.toLowerCase();
  
  try {
    // @ts-ignore - Dynamic model access
    const record = await (prisma as any)[modelName].findUnique({
      where: { id: entityId }
    });
    return record;
  } catch (error) {
    logger.error(`Failed to capture state for ${entityType}/${entityId}`, { error });
    return null;
  }
}

// Helper to create audit log entry
async function createAuditLog(data: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById?: string;
  ipAddress?: string;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        performedById: data.performedById || 'system', // Required field
        ipAddress: data.ipAddress,
        // userAgent removed - not in schema
        previousState: data.previousState || null,
        newState: data.newState || null,
        metadata: data.metadata || {}
      }
    });
    logger.info('Audit log created', { 
      action: data.action, 
      entityType: data.entityType, 
      entityId: data.entityId 
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error });
  }
}

// Specific audit middleware for bill operations
export const auditBillOperation = auditFinancialEvent({
  entityType: 'Bill',
  action: 'update',
  capturePreviousState: true,
  captureNewState: true,
  metadata: { operation: 'bill_update' }
});

// Audit for payment operations
export const auditPaymentOperation = auditFinancialEvent({
  entityType: 'Payment',
  action: 'create',
  capturePreviousState: false,
  captureNewState: true,
  metadata: { operation: 'payment_received' }
});

// Audit for void operations
export const auditVoidOperation = auditFinancialEvent({
  entityType: 'BillLineItem',
  action: 'void',
  capturePreviousState: true,
  captureNewState: true,
  metadata: { operation: 'void_line_item' }
});

// Audit for claim submissions
export const auditClaimSubmission = auditFinancialEvent({
  entityType: 'InsuranceClaim',
  action: 'submit',
  capturePreviousState: true,
  captureNewState: true,
  metadata: { operation: 'claim_submission' }
});

// Middleware to log all financial mutations
export const logFinancialMutation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  // Track if this is a financial endpoint
  const isFinancialEndpoint = req.path.match(/\/(bill|payment|claim|waiver)/i);

  if (!isFinancialEndpoint) {
    return next();
  }

  let entityId: string | null = null;
  let previousState: any = null;

  // Try to capture previous state before mutation
  if (req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
    const possibleId = req.params.id || req.params.billId || req.params.claimId;
    if (possibleId) {
      entityId = possibleId as string;
      try {
        // Determine entity type from URL
        let entityType = 'Unknown';
        if (req.path.includes('/bill')) entityType = 'Bill';
        if (req.path.includes('/payment')) entityType = 'Payment';
        if (req.path.includes('/claim')) entityType = 'InsuranceClaim';
        if (req.path.includes('/waiver')) entityType = 'PatientWaiver';
        
        previousState = await captureEntityState(entityType, entityId);
      } catch (error) {
        console.warn('Could not capture previous state:', error);
      }
    }
  }

  // Override json to log after response
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    if (body?.success !== false && entityId) {
      // Determine action based on HTTP method
      let action: AuditAction = 'update';
      if (req.method === 'POST') action = 'create';
      if (req.method === 'DELETE') action = 'delete';
      if (req.body?.status === 'voided' || req.body?.isVoided) action = 'void';

      // Determine entity type from URL
      let entityType = 'Unknown';
      if (req.path.includes('/bill')) entityType = 'Bill';
      if (req.path.includes('/payment')) entityType = 'Payment';
      if (req.path.includes('/claim')) entityType = 'InsuranceClaim';
      if (req.path.includes('/waiver')) entityType = 'PatientWaiver';

      createAuditLog({
        entityType,
        entityId: entityId!,
        action,
        performedById: req.user?.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        previousState,
        newState: body?.data,
        metadata: {
          method: req.method,
          url: req.originalUrl,
          responseTime,
          requestBody: req.body,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'] // Store in metadata
        }
      }).catch(err => logger.error('Failed to create audit log', { error: err }));
    }

    return originalJson.call(this, body);
  };

  next();
};

// Get audit trail for an entity
export const getAuditTrail = async (entityType: string, entityId: string) => {
  return await prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: {
      performedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true
        }
      }
    },
    orderBy: { timestamp: 'desc' }
  });
};

// Get audit trail by user
export const getUserAuditTrail = async (userId: string, limit = 100) => {
  return await prisma.auditLog.findMany({
    where: { performedById: userId },
    include: {
      performedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
};