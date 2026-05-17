// InsuranceProviderRepository.ts
import { PrismaClient, InsuranceProvider, InsuranceType } from '@prisma/client';
import { ContactInfo, InsuranceProviderWithRelations } from './InsuranceProviderTypes';

export class InsuranceProviderRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async findAll(filters: {
    isActive?: boolean;
    type?: InsuranceType;
  }): Promise<InsuranceProvider[]> {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.insuranceProvider.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        }
      }
    });
  }

  async findById(id: string): Promise<InsuranceProviderWithRelations | null> {
    return this.prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        patients: {
          select: {
            id: true,
            folderNumber: true,
            fullName: true,
            contact: true
          },
          take: 10,
          orderBy: { fullName: 'asc' }
        },
        attendances: {
          select: {
            id: true,
            attendanceNumber: true,
            attendanceType: true,
            status: true,
            dateTime: true
          },
          take: 10,
          orderBy: { dateTime: 'desc' }
        },
        bills: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            status: true,
            billDate: true
          },
          take: 10,
          orderBy: { billDate: 'desc' }
        },
        insuranceClaims: {
          select: {
            id: true,
            claimNumber: true,
            totalClaimAmount: true,
            status: true,
            submissionDate: true
          },
          take: 10,
          orderBy: { submissionDate: 'desc' }
        },
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        }
      }
    });
  }

  async findByName(name: string, excludeId?: string): Promise<InsuranceProvider | null> {
    return this.prisma.insuranceProvider.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
  }

  async create(data: {
    name: string;
    type: InsuranceType;
    coveragePercentage: number;
    contactInfo?: ContactInfo | null;
    isActive: boolean;
  }): Promise<InsuranceProvider> {
    return this.prisma.insuranceProvider.create({
      data,
      include: {
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        }
      }
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    type: InsuranceType;
    coveragePercentage: number;
    contactInfo?: ContactInfo | null;
    isActive: boolean;
  }>): Promise<InsuranceProvider> {
    return this.prisma.insuranceProvider.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.insuranceProvider.delete({
      where: { id }
    });
  }

  async toggleStatus(id: string): Promise<InsuranceProvider> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id }
    });

    if (!provider) {
      throw new Error('Insurance provider not found');
    }

    return this.prisma.insuranceProvider.update({
      where: { id },
      data: {
        isActive: !provider.isActive
      }
    });
  }

  async findByIdWithStats(id: string): Promise<any> {
    return this.prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        },
        bills: {
          select: {
            status: true,
            totalAmount: true,
            balance: true
          }
        },
        insuranceClaims: {
          select: {
            status: true,
            totalClaimAmount: true,
            approvedAmount: true
          }
        }
      }
    });
  }

  async hasRelatedRecords(id: string): Promise<boolean> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        patients: { take: 1 },
        attendances: { take: 1 },
        bills: { take: 1 },
        insuranceClaims: { take: 1 }
      }
    });

    if (!provider) {
      return false;
    }

    return (
      provider.patients.length > 0 ||
      provider.attendances.length > 0 ||
      provider.bills.length > 0 ||
      provider.insuranceClaims.length > 0
    );
  }
}
