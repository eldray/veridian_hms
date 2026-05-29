// modules/labTest/LabTestRepository.ts
import { PrismaClient, ServiceType } from '@prisma/client';
import { LabTestQueryParams, CreateLabTestDTO, UpdateLabTestDTO, BulkUpdateDTO } from './LabTestTypes';

export class LabTestRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(params: LabTestQueryParams) {
    const { isActive, category, subType, page = 1, limit = 10000 } = params;
    
    const where: any = {
      serviceType: ServiceType.lab_test
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (category) {
      where.serviceCategory = category;
    }

    if (subType) {
      where.subType = { contains: subType, mode: 'insensitive' };
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(10000, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      this.prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: true,
          labTests: {
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
        serviceType: ServiceType.lab_test
      },
      include: {
        pricing: true,
        labTests: {
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

  async create(data: CreateLabTestDTO, userId: string | undefined) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.serviceCatalog.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          serviceType: ServiceType.lab_test,
          serviceCategory: data.serviceCategory,
          subType: data.subType || null,
          nhisServiceCode: data.nhisServiceCode,
          tariffCode: data.tariffCode,
          isNHISCovered: data.isNHISCovered !== undefined ? data.isNHISCovered : true,
          nhisRequiresAuth: data.nhisRequiresAuth || false,
          privateInsRequiresAuth: data.privateInsRequiresAuth || false,
          isPrivateInsuranceExempted: data.isPrivateInsuranceExempted || false,
          metadata: {
            specimenType: data.specimenType,
            preparationInstructions: data.preparationInstructions,
            turnaroundTime: data.turnaroundTime,
            normalRange: data.normalRange,
            containerType: data.containerType,
            resultTemplate: data.resultTemplate
          },
          isActive: data.isActive !== undefined ? data.isActive : true,
          unit: data.unit || 'Test',
          createdById: userId
        }
      });

      await tx.servicePricing.create({
        data: {
          serviceCatalogId: template.id,
          cashPrice: data.cashPrice,
          nhisPrice: data.nhisPrice || 0,
          insurancePrice: data.insurancePrice,
          vatRate: data.vatRate || 0,
          isTaxable: data.isTaxable !== undefined ? data.isTaxable : true,
          isActive: true,
          effectiveDate: new Date()
        }
      });

      return template;
    });
  }

  async update(id: string, data: UpdateLabTestDTO, existingTemplate: any) {
    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { ...data };

      delete updateData.cashPrice;
      delete updateData.nhisPrice;
      delete updateData.insurancePrice;
      delete updateData.vatRate;
      delete updateData.isTaxable;

      if (
        data.specimenType !== undefined ||
        data.preparationInstructions !== undefined ||
        data.turnaroundTime !== undefined ||
        data.normalRange !== undefined ||
        data.containerType !== undefined ||
        data.resultTemplate !== undefined
      ) {
        const currentMetadata = existingTemplate.metadata as any || {};
        updateData.metadata = {
          ...currentMetadata,
          specimenType: data.specimenType !== undefined ? data.specimenType : currentMetadata.specimenType,
          preparationInstructions: data.preparationInstructions !== undefined ? data.preparationInstructions : currentMetadata.preparationInstructions,
          turnaroundTime: data.turnaroundTime !== undefined ? data.turnaroundTime : currentMetadata.turnaroundTime,
          normalRange: data.normalRange !== undefined ? data.normalRange : currentMetadata.normalRange,
          containerType: data.containerType !== undefined ? data.containerType : currentMetadata.containerType,
          resultTemplate: data.resultTemplate !== undefined ? data.resultTemplate : currentMetadata.resultTemplate
        };
      }

      if (data.subType !== undefined) {
        updateData.subType = data.subType;
      }

      if (data.nhisRequiresAuth !== undefined) {
        updateData.nhisRequiresAuth = data.nhisRequiresAuth;
      }
      if (data.privateInsRequiresAuth !== undefined) {
        updateData.privateInsRequiresAuth = data.privateInsRequiresAuth;
      }
      if (data.isPrivateInsuranceExempted !== undefined) {
        updateData.isPrivateInsuranceExempted = data.isPrivateInsuranceExempted;
      }

      const template = await tx.serviceCatalog.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

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
          serviceType: ServiceType.lab_test
        },
        include: {
          labTests: { take: 1 },
          pricing: true
        }
      });

      if (!existingTemplate) {
        throw new Error('Lab test not found');
      }

      if (existingTemplate.labTests.length > 0) {
        throw new Error('Cannot delete lab test with associated lab test orders');
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
        serviceType: ServiceType.lab_test
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

  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.serviceCatalog.findMany({
      where: {
        serviceType: ServiceType.lab_test,
        subType: { not: null }
      },
      select: { subType: true },
      distinct: ['subType']
    });

    const defaultCategories = [
      'hematology', 'biochemistry', 'microbiology', 'serology',
      'immunology', 'molecular', 'pathology', 'cytology',
      'histopathology', 'urinalysis', 'pulmonology', 'neurology',
      'cardiology', 'gastroenterology', 'endocrinology', 'toxicology'
    ];

    const existingCategories = categories
      .map(c => c.subType)
      .filter(Boolean) as string[];

    return existingCategories.length > 0 ? existingCategories : defaultCategories;
  }

  // ✅ ADDED: Get specimen types (for frontend dropdown)
  async getSpecimenTypes(): Promise<string[]> {
    return [
      'Blood', 'Urine', 'Stool', 'Sputum', 'CSF', 'Tissue',
      'Swab', 'Fluid', 'Hair', 'Nail', 'Other'
    ];
  }

  // ✅ ADDED: Get preparation instructions (for frontend dropdown)
  async getPreparationInstructions(): Promise<string[]> {
    return [
      'Fasting required',
      'No special preparation',
      'Morning sample preferred',
      'Random sample',
      '24-hour collection',
      'Sterile collection required'
    ];
  }
}