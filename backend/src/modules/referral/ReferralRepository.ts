// modules/referral/ReferralRepository.ts
import { PrismaClient, ReferralType, ReferralStatus, Priority } from '@prisma/client';
import { 
  CreateOutgoingReferralDTO, 
  CreateIncomingReferralDTO, 
  ReferralFilters 
} from './ReferralTypes';
import { getCounterService } from '../../services/CounterService'; // ✅ Import counter service

export class ReferralRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters: ReferralFilters) {
    const {
      referralType,
      status,
      patientId,
      patientPaymentMode,
      corporateAccountId,
      insuranceProviderId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = filters;

    const where: any = {};

    if (referralType) where.referralType = referralType;
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    
    if (patientPaymentMode) {
      where.patient = { paymentMode: patientPaymentMode };
    }
    
    if (corporateAccountId) {
      where.patient = { insuranceProviderId: corporateAccountId };
    }
    
    if (insuranceProviderId) {
      where.patient = { insuranceProviderId };
    }

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
              gender: true,
              paymentMode: true,
              nhisNumber: true,
              insuranceProviderId: true
            }
          },
          attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              dateTime: true,
              attendanceType: true,
              encounterCategory: true,
              paymentMode: true,
              InsuranceProvider: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              },
              CorporateAccount: {
                select: {
                  id: true,
                  companyName: true
                }
              }
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
            paymentMode: true,
            nhisNumber: true,
            insuranceProviderId: true,
            InsuranceProvider: {
              select: {
                id: true,
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
            paymentMode: true,
            nhisCCC: true,
            InsuranceProvider: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            CorporateAccount: {
              select: {
                id: true,
                companyName: true
              }
            },
            AttendanceDiagnosis: {
              include: {
                Diagnosis: {
                  select: {
                    name: true,
                    icdCode: true,
                    morbidityGroup: true
                  }
                }
              }
            },
            Vitals: {
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
    const counterService = getCounterService(); // ✅ Get counter service instance
    
    return this.prisma.referralRecord.create({
      data: {
        referralNumber: counterService.nextReferralNumber(), // ✅ Use counter service
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
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            dateOfBirth: true,
            gender: true,
            paymentMode: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            paymentMode: true
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
    const counterService = getCounterService(); // ✅ Get counter service instance
    
    return this.prisma.referralRecord.create({
      data: {
        referralNumber: counterService.nextReferralNumber(), // ✅ Use counter service
        patientId: data.patientId,
        referralType: 'incoming',
        referralReason: data.referralReason,
        referredFromFacility: data.referredFromFacility,
        referredFromDoctor: data.referredFromDoctor,
        urgency: data.urgency || 'routine',
        referralNotes: data.referralNotes,
        status: 'pending',
        createdById
      },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            dateOfBirth: true,
            gender: true,
            paymentMode: true
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

  async updateStatus(id: string, status: ReferralStatus, notes?: { 
    acceptanceNotes?: string; 
    rejectedReason?: string;
    outcomeNotes?: string;
  }) {
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
    
    if (notes?.outcomeNotes) {
      updateData.outcomeNotes = notes.outcomeNotes;
    }

    return this.prisma.referralRecord.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            paymentMode: true
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
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            paymentMode: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        }
      },
      orderBy: { referralDate: 'desc' }
    });
  }

  async getStats() {
    const [total, pending, accepted, rejected, completed, urgent] = await Promise.all([
      this.prisma.referralRecord.count(),
      this.prisma.referralRecord.count({ where: { status: 'pending' } }),
      this.prisma.referralRecord.count({ where: { status: 'accepted' } }),
      this.prisma.referralRecord.count({ where: { status: 'rejected' } }),
      this.prisma.referralRecord.count({ where: { status: 'completed' } }),
      this.prisma.referralRecord.count({ where: { urgency: { in: ['urgent', 'stat'] } } })
    ]);

    return {
      total,
      pending,
      accepted,
      rejected,
      completed,
      urgent
    };
  }
}