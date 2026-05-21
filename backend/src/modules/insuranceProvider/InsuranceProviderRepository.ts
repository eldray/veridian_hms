// InsuranceProviderRepository.ts - FIXED
import { PrismaClient, InsuranceProvider, InsuranceType } from '@prisma/client';
import { ContactInfo, InsuranceProviderWithRelations } from './InsuranceProviderTypes';

export class InsuranceProviderRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async findAll(filters: { isActive?: boolean; type?: InsuranceType }) {
    const where: any = {};
  
    // ✅ ONLY filter by type if provided
    if (filters.type) {
      where.type = filters.type;
    }
  
    // ✅ DO NOT filter by isActive here - return ALL providers
    // Let the frontend handle filtering based on user preference
  
    return this.prisma.insuranceProvider.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        coveragePercentage: true,
        contactInfo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            Patient: true,
            Attendance: true,
            Bill: true,
            InsuranceClaim: true
          }
        }
      }
    });
  }

  async findById(id: string): Promise<InsuranceProviderWithRelations | null> {
    // ✅ FIXED: Use correct relation names
    return this.prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        Patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
            contact: true
          },
          take: 10,
          orderBy: { surname: 'asc' }
        },
        Attendance: {
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
        Bill: {
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
        InsuranceClaim: {
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
            Patient: true,
            Attendance: true,
            Bill: true,
            InsuranceClaim: true
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
            Patient: true,
            Attendance: true,
            Bill: true,
            InsuranceClaim: true
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
            Patient: true,
            Attendance: true,
            Bill: true,
            InsuranceClaim: true
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
            Patient: true,
            Attendance: true,
            Bill: true,
            InsuranceClaim: true
          }
        },
        Bill: {
          select: {
            status: true,
            totalAmount: true,
            balance: true
          }
        },
        InsuranceClaim: {
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
        Patient: { take: 1 },
        Attendance: { take: 1 },
        Bill: { take: 1 },
        InsuranceClaim: { take: 1 }
      }
    });

    if (!provider) {
      return false;
    }

    return (
      provider.Patient.length > 0 ||
      provider.Attendance.length > 0 ||
      provider.Bill.length > 0 ||
      provider.InsuranceClaim.length > 0
    );
  }
}