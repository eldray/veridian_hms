// services/GHSMalariaReportService.ts
// Based on malaria data.pdf - Detailed malaria testing and treatment

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MalariaReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  opdMalaria: {
    under5: {
      suspected: number;
      confirmed: number;
      treatedWithACT: number;
    };
    above5: {
      suspected: number;
      confirmed: number;
      treatedWithACT: number;
    };
  };
  testing: {
    microscopy: number;
    microscopyPositive: number;
    rdt: number;
    rdtPositive: number;
  };
  commodities: {
    asaq: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
    al: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
    dhap: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
    quinine: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
    artesunate_injection: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
    rdt_kits: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
    sp: { openingStock: number; dispensed: number; closingStock: number; stockOut: boolean };
  };
}

export class GHSMalariaReportService {
  
  static async generateMalariaReport(startDate: Date, endDate: Date): Promise<MalariaReport> {
    // Fetch malaria-related attendances
    const malariaAttendances = await prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
        AttendanceDiagnosis: {
          some: {
            Diagnosis: {
              OR: [
                { name: { contains: 'malaria', mode: 'insensitive' } },
                { icdCode: { startsWith: 'B5' } }
              ]
            }
          }
        }
      },
      include: {
        Patient: {
          select: {
            dateOfBirth: true
          }
        },
        LabTest: {
          include: {
            ServiceCatalog: true
          }
        },
        Medication: {
          include: {
            StockItem: true
          }
        }
      }
    });
    
    let under5_suspected = 0;
    let under5_confirmed = 0;
    let under5_act = 0;
    let above5_suspected = 0;
    let above5_confirmed = 0;
    let above5_act = 0;
    let microscopy = 0;
    let microscopy_positive = 0;
    let rdt = 0;
    let rdt_positive = 0;
    
    for (const attendance of malariaAttendances) {
      const ageInYears = (new Date(attendance.dateTime).getTime() - attendance.Patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const isUnder5 = ageInYears < 5;
      
      if (isUnder5) {
        under5_suspected++;
      } else {
        above5_suspected++;
      }
      
      // Check lab confirmation
      for (const lab of attendance.LabTest) {
        if (lab.result && JSON.stringify(lab.result).toLowerCase().includes('positive')) {
          if (isUnder5) under5_confirmed++;
          else above5_confirmed++;
        }
        
        const testName = lab.ServiceCatalog?.name?.toLowerCase() || '';
        if (testName.includes('microscopy')) {
          microscopy++;
          if (lab.result && JSON.stringify(lab.result).toLowerCase().includes('positive')) microscopy_positive++;
        } else if (testName.includes('rdt') || testName.includes('rapid')) {
          rdt++;
          if (lab.result && JSON.stringify(lab.result).toLowerCase().includes('positive')) rdt_positive++;
        }
      }
      
      // Check ACT treatment
      for (const med of attendance.Medication) {
        if (med.name?.toLowerCase().includes('artemether') || 
            med.name?.toLowerCase().includes('lumefantrine') ||
            med.name?.toLowerCase().includes('artesunate')) {
          if (isUnder5) under5_act++;
          else above5_act++;
          break;
        }
      }
    }
    
    // Get malaria commodity stock data
    const commodities = await prisma.malariaCommodityStock.findMany({
      where: {
        reportingMonth: {
          gte: startDate,
          lt: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
        }
      }
    });
    
    const hospital = await prisma.hospital.findFirst();
    
    return {
      period: {
        startDate,
        endDate,
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1
      },
      facility: {
        name: hospital?.name || 'Hospital',
        district: hospital?.ghsDistrictCode || 'Unknown',
        ghfCode: hospital?.ghaHFCode || 'Unknown'
      },
      opdMalaria: {
        under5: {
          suspected: under5_suspected,
          confirmed: under5_confirmed,
          treatedWithACT: under5_act
        },
        above5: {
          suspected: above5_suspected,
          confirmed: above5_confirmed,
          treatedWithACT: above5_act
        }
      },
      testing: {
        microscopy,
        microscopyPositive: microscopy_positive,
        rdt,
        rdtPositive: rdt_positive
      },
      commodities: {
        asaq: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false },
        al: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false },
        dhap: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false },
        quinine: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false },
        artesunate_injection: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false },
        rdt_kits: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false },
        sp: { openingStock: 0, dispensed: 0, closingStock: 0, stockOut: false }
      }
    };
  }
}