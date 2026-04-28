import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
  static async log(
    entityType: string,
    entityId: string,
    action: string,
    performedById: string,
    previousState?: any,
    newState?: any,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action: action as any,
        performedById,
        ipAddress,
        userAgent,
        previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : undefined,
        newState: newState ? JSON.parse(JSON.stringify(newState)) : undefined,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        timestamp: new Date()
      }
    });
  }

  static async logFinancialEvent(
    entityType: string,
    entityId: string,
    action: string,
    performedById: string,
    previousState: any,
    newState: any,
    metadata?: any
  ): Promise<void> {
    await this.log(entityType, entityId, action, performedById, previousState, newState, metadata);
  }

  static async getHistory(entityType: string, entityId: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
      include: {
        performedBy: {
          select: { fullName: true, username: true, role: true }
        }
      }
    });
  }
}