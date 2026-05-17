// ScanTemplateRepository.ts - Data access layer for scan template module

import { PrismaClient, ServiceCategory } from '@prisma/client';
import {
  ScanTemplateQueryParams,
  CreateScanTemplateDTO,
  UpdateScanTemplateDTO,
  BulkUpdateDTO
} from './ScanTemplateTypes';

export class ScanTemplateRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(params: ScanTemplateQueryParams) {
    const { isActive, category, bodyPart, scanType, page = 1, limit = 10000 } = params;
    
    const where: any = {
      serviceType: 'scan'
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (category) {
      where.serviceCategory = category;
    }

    if (bodyPart) {
      where.subType = bodyPart;
    }

    if (scanType) {
      where.OR = [
        { name: { contains: scanType, mode: 'insensitive' } },
        { description: { contains: scanType, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(10000, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      this.prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: true,
          scans: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        skip,
        take: limitNum
      }),
      this.prisma.serviceCatalog.count({ where })
    ]);

    return { templates, total, pageNum, limitNum };
  }

  async findById(id: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: {
        id,
        serviceType: 'scan'
      },
      include: {
        pricing: true,
        scans: {
          include: {
            Attendance: {
              select: {
                attendanceNumber: true,
                Patient: {
                  select: {
                    surname: true,
                    otherNames: true,
                    folderNumber: true
                  }
                }
              }
            }
          },
          orderBy: {
            requestedAt: 'desc'
          },
          take: 10
        }
      }
    });
  }

  async create(data: CreateScanTemplateDTO, userId: string | undefined) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.serviceCatalog.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          serviceType: 'scan',
          serviceCategory: data.serviceCategory,
          subType: data.bodyPart || null,
          nhisServiceCode: data.nhisServiceCode,
          tariffCode: data.tariffCode,
          isNHISCovered: data.isNHISCovered !== undefined ? data.isNHISCovered : true,
          nhisRequiresAuth: data.nhisRequiresAuth || false,
          metadata: {
            bodyPart: data.bodyPart,
            preparationInstructions: data.preparationInstructions,
            duration: data.duration,
            contrastRequired: data.contrastRequired || false,
            scanType: data.scanType
          },
          isActive: data.isActive !== undefined ? data.isActive : true,
          unit: data.unit || 'Each',
          createdById: userId
        }
      });

      await tx.servicePricing.create({
        data: {
          serviceCatalogId: template.id,
          cashPrice: data.cashPrice,
          nhisPrice: data.nhisPrice || 0,
          insurancePrice: data.insurancePrice,
          vatRate: data.vatRate ? data.vatRate : 0,
          isTaxable: data.isTaxable !== undefined ? data.isTaxable : true,
          isActive: true,
          effectiveDate: new Date()
        }
      });

      return template;
    });
  }

  async update(id: string, data: UpdateScanTemplateDTO, existingTemplate: any) {
    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { ...data };

      // Remove pricing fields from main update
      delete updateData.cashPrice;
      delete updateData.nhisPrice;
      delete updateData.insurancePrice;
      delete updateData.vatRate;
      delete updateData.isTaxable;

      // Handle metadata updates
      if (
        data.bodyPart !== undefined ||
        data.preparationInstructions !== undefined ||
        data.duration !== undefined ||
        data.contrastRequired !== undefined ||
        data.scanType !== undefined
      ) {
        const currentMetadata = existingTemplate.metadata as any || {};
        updateData.metadata = {
          ...currentMetadata,
          bodyPart: data.bodyPart !== undefined ? data.bodyPart : currentMetadata.bodyPart,
          preparationInstructions: data.preparationInstructions !== undefined ? data.preparationInstructions : currentMetadata.preparationInstructions,
          duration: data.duration !== undefined ? data.duration : currentMetadata.duration,
          contrastRequired: data.contrastRequired !== undefined ? data.contrastRequired : currentMetadata.contrastRequired,
          scanType: data.scanType !== undefined ? data.scanType : currentMetadata.scanType
        };
      }

      if (data.bodyPart !== undefined) {
        updateData.subType = data.bodyPart;
      }

      if (data.nhisRequiresAuth !== undefined) {
        updateData.nhisRequiresAuth = data.nhisRequiresAuth;
      }

      const template = await tx.serviceCatalog.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      // Update pricing if any pricing fields are provided
      if (
        data.cashPrice !== undefined ||
        data.nhisPrice !== undefined ||
        data.insurancePrice !== undefined
      ) {
        await tx.servicePricing.update({
          where: { serviceCatalogId: id },
          data: {
            cashPrice: data.cashPrice !== undefined ? data.cashPrice : undefined,
            nhisPrice: data.nhisPrice !== undefined ? data.nhisPrice : undefined,
            insurancePrice: data.insurancePrice !== undefined ? data.insurancePrice : undefined,
            vatRate: data.vatRate !== undefined ? data.vatRate : undefined,
            isTaxable: data.isTaxable !== undefined ? data.isTaxable : undefined,
            updatedAt: new Date()
          }
        });
      }

      return template;
    });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingTemplate = await tx.serviceCatalog.findFirst({
        where: {
          id,
          serviceType: 'scan'
        },
        include: {
          scans: { take: 1 },
          pricing: true
        }
      });

      if (!existingTemplate) {
        throw new Error('Scan template not found');
      }

      if (existingTemplate.scans.length > 0) {
        throw new Error('Cannot delete scan template with associated scans');
      }

      if (existingTemplate.pricing) {
        await tx.servicePricing.delete({
          where: { serviceCatalogId: id }
        });
      }

      await tx.serviceCatalog.delete({
        where: { id }
      });
    });
  }

  async bulkUpdate(data: BulkUpdateDTO) {
    const result = await this.prisma.serviceCatalog.updateMany({
      where: {
        id: { in: data.ids },
        serviceType: 'scan'
      },
      data: {
        isActive: data.isActive,
        updatedAt: new Date()
      }
    });

    return result;
  }

  async findByCode(code: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: { code }
    });
  }

  async findDistinctBodyParts(): Promise<string[]> {
    const templates = await this.prisma.serviceCatalog.findMany({
      where: {
        serviceType: 'scan',
        subType: { not: null }
      },
      select: { subType: true },
      distinct: ['subType']
    });

    return templates
      .map(t => t.subType)
      .filter(Boolean) as string[];
  }

  async findDistinctScanTypes(): Promise<string[]> {
    const templates = await this.prisma.serviceCatalog.findMany({
      where: {
        serviceType: 'scan',
        metadata: {
          path: ['scanType'],
          not: null
        }
      },
      select: { metadata: true }
    });

    const scanTypes = templates
      .map(t => (t.metadata as any)?.scanType)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);

    return scanTypes;
  }

  async getCategories(): Promise<string[]> {
    return Object.values(ServiceCategory);
  }
}
