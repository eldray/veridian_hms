// backend/src/modules/referral/ReferralRepository.ts

import { PrismaClient, ReferralType, ReferralStatus, Priority } from '@prisma/client';
import { 
  CreateOutgoingReferralDTO, 
  CreateIncomingReferralDTO, 
  ReferralFilters 
} from './ReferralTypes';
import { BaseService } from '../../shared/base/BaseService';

export class ReferralRepository extends BaseService {
  private prisma: PrismaClient;

  constructor() {
    super('ReferralRepository');
    this.prisma = new PrismaClient();
  }

  async findAll(filters: ReferralFilters) {
    const {
      referralType,
      status,
      patientId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = filters;

    const where: any = {};

    if (referralType) where.referralType = referralType;
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    if (dateFrom || dateTo) {
      where.referralDate = {};
      if (dateFrom) where.referralDate.gte = new Date(dateFrom);
      if (dateTo) where.referralDate.lte = new Date(dateTo);
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [referrals, total] = await Promise.all([
      this.prisma.referralRecord.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              dateOfBirth: true,
              gender: true
            }
          },
          attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              dateTime: true,
              attendanceType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { referralDate: 'desc' },
        skip,
        take: limitNum
      }),
      this.prisma.referralRecord.count({ where })
    ]);

    // Add full name to patient objects
    const referralsWithFullName = referrals.map(ref => ({
      ...ref,
      patient: ref.patient ? {
        ...ref.patient,
        fullName: `${ref.patient.surname} ${ref.patient.otherNames}`.trim()
      } : null
    }));

    return {
      data: referralsWithFullName,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  async findById(id: string) {
    const referral = await this.prisma.referralRecord.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            address: true,
            dateOfBirth: true,
            gender: true,
            insuranceProvider: {
              select: {
                name: true,
                type: true
              }
            }
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            attendanceType: true,
            encounterCategory: true,
            diagnoses: {
              include: {
                diagnosis: {
                  select: {
                    name: true,
                    icdCode: true
                  }
                }
              }
            },
            vitals: {
              orderBy: { recordedAt: 'desc' },
              take: 1
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });

    if (!referral) {
      throw new Error('Referral not found');
    }

    return {
      ...referral,
      patient: referral.patient ? {
        ...referral.patient,
        fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
      } : null
    };
  }

  async createOutgoing(data: CreateOutgoingReferralDTO, createdById: string) {
    const referralCount = await this.prisma.referralRecord.count();
    const referralNumber = `REF-${new Date().getFullYear()}-${String(referralCount + 1).padStart(6, '0')}`;

    return this.prisma.referralRecord.create({
      data: {
        referralNumber,
        patientId: data.patientId,
        attendanceId: data.attendanceId,
        referralType: 'outgoing',
        referralReason: data.referralReason,
        referredToFacility: data.referredToFacility,
        referredToDoctor: data.referredToDoctor,
        referredToDepartment: data.referredToDepartment,
        urgency: data.urgency || 'routine',
        referralNotes: data.referralNotes,
        status: 'pending',
        createdById
      },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            dateOfBirth: true,
            gender: true
          }
        },
        attendance: {
          select: {
            attendanceNumber: true,
            dateTime: true
          }
        },
        createdBy: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });
  }

  async createIncoming(data: CreateIncomingReferralDTO, createdById: string) {
    const referralCount = await this.prisma.referralRecord.count();
    const referralNumber = `REF-${new Date().getFullYear()}-${String(referralCount + 1).padStart(6, '0')}`;

    return this.prisma.referralRecord.create({
      data: {
        referralNumber,
        patientId: data.patientId,
        referralType: 'incoming',
        referralReason: data.referralReason,
        referredFromFacility: data.referredFromFacility,
        referredFromDoctor: data.referredFromDoctor,
        urgency: data.urgency || 'routine',
        referralNotes: data.referralNotes,
        referringFacilityContact: data.referringFacilityContact,
        status: 'pending',
        createdById
      },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            dateOfBirth: true,
            gender: true
          }
        },
        createdBy: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });
  }

  async updateStatus(id: string, status: ReferralStatus, notes?: { acceptanceNotes?: string; rejectedReason?: string }) {
    const updateData: any = { status };
    
    if (status === 'accepted' && notes?.acceptanceNotes) {
      updateData.acceptanceNotes = notes.acceptanceNotes;
      updateData.acceptedAt = new Date();
    } else if (status === 'rejected' && notes?.rejectedReason) {
      updateData.rejectedReason = notes.rejectedReason;
      updateData.rejectedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    return this.prisma.referralRecord.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true
          }
        }
      }
    });
  }

  async delete(id: string) {
    return this.prisma.referralRecord.delete({
      where: { id }
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.referralRecord.findMany({
      where: { patientId },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        attendance: {
          select: {
            attendanceNumber: true,
            dateTime: true
          }
        }
      },
      orderBy: { referralDate: 'desc' }
    });
  }
}
