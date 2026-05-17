// HospitalRepository.ts
import { PrismaClient, Hospital } from '@prisma/client';

export class HospitalRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async findAll(orderBy: { [key: string]: 'asc' | 'desc' } = { name: 'asc' }): Promise<Hospital[]> {
    return this.prisma.hospital.findMany({
      orderBy
    });
  }

  async findById(id: string): Promise<Hospital | null> {
    return this.prisma.hospital.findUnique({
      where: { id }
    });
  }

  async findActive(): Promise<Hospital | null> {
    return this.prisma.hospital.findFirst({
      where: { isActive: true }
    });
  }

  async create(data: {
    name: string;
    address: string;
    phone: string;
    email: string;
    nhisFacilityCode: string;
    nhisFacilityType: string;
    nhisAccreditationNumber?: string;
    nhisAccreditationDate?: Date;
    nhisAccreditationExpiry?: Date;
    nhisContactPerson?: string;
    nhisContactPhone?: string;
    nhisContactEmail?: string;
    isActive: boolean;
  }): Promise<Hospital> {
    return this.prisma.hospital.create({
      data
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    address: string;
    phone: string;
    email: string;
    nhisFacilityCode: string;
    nhisFacilityType: string;
    nhisAccreditationNumber?: string;
    nhisAccreditationDate?: Date;
    nhisAccreditationExpiry?: Date;
    nhisContactPerson?: string;
    nhisContactPhone?: string;
    nhisContactEmail?: string;
    isActive: boolean;
  }>): Promise<Hospital> {
    return this.prisma.hospital.update({
      where: { id },
      data
    });
  }

  async updateActive(data: Partial<{
    name: string;
    address: string;
    phone: string;
    email: string;
    nhisFacilityCode: string;
    nhisFacilityType: string;
    nhisAccreditationNumber?: string;
    nhisAccreditationDate?: Date;
    nhisAccreditationExpiry?: Date;
    nhisContactPerson?: string;
    nhisContactPhone?: string;
    nhisContactEmail?: string;
  }>): Promise<Hospital> {
    return this.prisma.hospital.update({
      where: { isActive: true },
      data
    });
  }

  async delete(id: string): Promise<Hospital> {
    return this.prisma.hospital.delete({
      where: { id }
    });
  }
}
