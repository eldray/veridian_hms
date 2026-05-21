// services/GHSMalariaReportService.ts
// Based on malaria data.pdf - Complete with all commodities and testing

import { PrismaClient } from '@prisma/client';

export interface MalariaReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  opdMalaria: {
    under5: {
      suspected: number;
      tested: number;
      confirmed: number;
      treatedWithACT: number;
    };
    above5: {
      suspected: number;
      tested: number;
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
    asaq_below_1yr: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    asaq_1_5yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    asaq_6_13yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    asaq_14_plus: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_0_3yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_4_8yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_9_13yrs: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    al_14_plus: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    dhap_40_320mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    quinine_tablet: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    quinine_injection: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    artesunate_injection_30mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    artesunate_injection_60mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    artesunate_injection_120mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    arthemeter_injection_40mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    arthemeter_injection_80mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    rectal_artesunate_50mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    rectal_artesunate_200mg: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    rdt_kits: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
    sp: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number };
  };
}

export class GHSMalariaReportService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {  // ✅ Accept prisma from caller
    this.prisma = prisma;
  }

  private async fetchCommodityData(startDate: Date): Promise<MalariaReport['commodities']> {
    const reportingMonthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const reportingMonthEnd   = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const commodityStocks = await this.prisma.malariaCommodityStock.findMany({
      where: {
        reportingMonth: {
          gte: reportingMonthStart,
          lte: reportingMonthEnd
        }
      }
    });

    const getCommodity = (type: string) => {
      const stock = commodityStocks.find(s => s.commodityType === type);
      return {
        openingStock: stock?.openingStock  ?? 0,
        dispensed:    stock?.dispensed     ?? 0,
        closingStock: stock?.closingStock  ?? 0,
        stockOutDays: stock?.stockOutDays  ?? 0
      };
    };

    return {
      asaq_below_1yr:           getCommodity('asaq_below_1yr'),
      asaq_1_5yrs:              getCommodity('asaq_1_5yrs'),
      asaq_6_13yrs:             getCommodity('asaq_6_13yrs'),
      asaq_14_plus:             getCommodity('asaq_14_plus'),
      al_0_3yrs:                getCommodity('al_0_3yrs'),
      al_4_8yrs:                getCommodity('al_4_8yrs'),
      al_9_13yrs:               getCommodity('al_9_13yrs'),
      al_14_plus:               getCommodity('al_14_plus'),
      dhap_40_320mg:            getCommodity('dhap_40_320mg'),
      quinine_tablet:           getCommodity('quinine_tablet'),
      quinine_injection:        getCommodity('quinine_injection'),
      artesunate_injection_30mg:  getCommodity('artesunate_injection_30mg'),
      artesunate_injection_60mg:  getCommodity('artesunate_injection_60mg'),
      artesunate_injection_120mg: getCommodity('artesunate_injection_120mg'),
      arthemeter_injection_40mg:  getCommodity('arthemeter_injection_40mg'),
      arthemeter_injection_80mg:  getCommodity('arthemeter_injection_80mg'),
      rectal_artesunate_50mg:   getCommodity('rectal_artesunate_50mg'),
      rectal_artesunate_200mg:  getCommodity('rectal_artesunate_200mg'),
      rdt_kits:                 getCommodity('rdt_kits'),
      sp:                       getCommodity('sp')
    };
  }

  async generateMalariaReport(startDate: Date, endDate: Date): Promise<MalariaReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Fetch malaria-related attendances
    const malariaAttendances = await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDateTime },
        status:   { not: 'cancelled' },
        AttendanceDiagnosis: {
          some: {
            Diagnosis: {
              OR: [
                { name:    { contains: 'malaria',    mode: 'insensitive' } },
                { name:    { contains: 'plasmodium', mode: 'insensitive' } },
                { icdCode: { startsWith: 'B50' } },
                { icdCode: { startsWith: 'B51' } },
                { icdCode: { startsWith: 'B52' } },
                { icdCode: { startsWith: 'B53' } },
                { icdCode: { startsWith: 'B54' } }
              ]
            }
          }
        }
      },
      include: {
        Patient: {
          select: {
            dateOfBirth: true,
            gender: true
          }
        },
        LabTest: {
          where: { status: { not: 'cancelled' } },
          include: { ServiceCatalog: true }
        },
        Medication: {
          where: { status: { not: 'cancelled' } },
          include: { StockItem: true }
        }
      }
    });

    let under5_suspected  = 0;
    let under5_tested     = 0;
    let under5_confirmed  = 0;
    let under5_act        = 0;
    let above5_suspected  = 0;
    let above5_tested     = 0;
    let above5_confirmed  = 0;
    let above5_act        = 0;
    let microscopy        = 0;
    let microscopy_positive = 0;
    let rdt               = 0;
    let rdt_positive      = 0;

    for (const attendance of malariaAttendances) {
      const ageInYears =
        (attendance.dateTime.getTime() - attendance.Patient.dateOfBirth.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const isUnder5 = ageInYears < 5;

      if (isUnder5) {
        under5_suspected++;
      } else {
        above5_suspected++;
      }

      let hasConfirmation = false;

      for (const lab of attendance.LabTest) {
        const testName  = lab.ServiceCatalog?.name?.toLowerCase() ?? '';
        const isPositive =
          lab.result != null &&
          JSON.stringify(lab.result).toLowerCase().includes('positive');

        if (testName.includes('microscopy')) {
          microscopy++;
          if (isPositive) microscopy_positive++;
        } else if (testName.includes('rdt') || testName.includes('rapid')) {
          rdt++;
          if (isPositive) rdt_positive++;
        }

        if (isPositive && !hasConfirmation) {
          hasConfirmation = true;
        }
      }

      if (attendance.LabTest.length > 0) {
        if (isUnder5) under5_tested++;
        else          above5_tested++;
      }

      if (hasConfirmation) {
        if (isUnder5) under5_confirmed++;
        else          above5_confirmed++;
      }

      // Check ACT treatment
      const actKeywords = ['artemether', 'lumefantrine', 'artesunate', 'amodiaquine', 'coartem', 'al', 'asaq'];
      let hasACT = false;

      for (const med of attendance.Medication) {
        const medName = med.name?.toLowerCase() ?? med.StockItem?.name?.toLowerCase() ?? '';
        if (actKeywords.some(keyword => medName.includes(keyword))) {
          hasACT = true;
          break;
        }
      }

      if (hasACT) {
        if (isUnder5) under5_act++;
        else          above5_act++;
      }
    }

    const hospital    = await this.prisma.hospital.findFirst();
    const commodities = await this.fetchCommodityData(startDate);

    return {
      period: {
        startDate,
        endDate,
        year:  startDate.getFullYear(),
        month: startDate.getMonth() + 1
      },
      facility: {
        name:     hospital?.name            ?? 'Hospital',
        district: hospital?.ghsDistrictCode ?? 'Unknown',
        ghfCode:  hospital?.ghaHFCode       ?? 'Unknown'
      },
      opdMalaria: {
        under5: {
          suspected:      under5_suspected,
          tested:         under5_tested,
          confirmed:      under5_confirmed,
          treatedWithACT: under5_act
        },
        above5: {
          suspected:      above5_suspected,
          tested:         above5_tested,
          confirmed:      above5_confirmed,
          treatedWithACT: above5_act
        }
      },
      testing: {
        microscopy,
        microscopyPositive: microscopy_positive,
        rdt,
        rdtPositive: rdt_positive
      },
      commodities
    };
  }

  exportToCSV(report: MalariaReport): string {
    const rows: string[] = [];

    rows.push(`"Malaria Data Report"`);
    rows.push(`"Facility","${report.facility.name}"`);
    rows.push(`"Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push(``);

    rows.push(`"OPD MALARIA CASES"`);
    rows.push(`"Age Group","Suspected","Tested","Confirmed","Treated with ACT"`);
    rows.push(`"Under 5 years",${report.opdMalaria.under5.suspected},${report.opdMalaria.under5.tested},${report.opdMalaria.under5.confirmed},${report.opdMalaria.under5.treatedWithACT}`);
    rows.push(`"5 years and Above",${report.opdMalaria.above5.suspected},${report.opdMalaria.above5.tested},${report.opdMalaria.above5.confirmed},${report.opdMalaria.above5.treatedWithACT}`);
    rows.push(``);

    rows.push(`"TESTING METHODS"`);
    rows.push(`"Method","Tested","Positive"`);
    rows.push(`"Microscopy",${report.testing.microscopy},${report.testing.microscopyPositive}`);
    rows.push(`"RDT",${report.testing.rdt},${report.testing.rdtPositive}`);
    rows.push(``);

    rows.push(`"MALARIA COMMODITIES"`);
    rows.push(`"Commodity","Opening Stock","Dispensed","Closing Stock","Stock Out Days"`);

    const addRow = (name: string, data: { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number }) => {
      rows.push(`"${name}",${data.openingStock},${data.dispensed},${data.closingStock},${data.stockOutDays}`);
    };

    addRow("ASAQ Below 1 yr",                  report.commodities.asaq_below_1yr);
    addRow("ASAQ 1-5 yrs",                      report.commodities.asaq_1_5yrs);
    addRow("ASAQ 6-13 yrs",                     report.commodities.asaq_6_13yrs);
    addRow("ASAQ 14+ yrs",                      report.commodities.asaq_14_plus);
    addRow("AL 0-3 yrs",                        report.commodities.al_0_3yrs);
    addRow("AL 4-8 yrs",                        report.commodities.al_4_8yrs);
    addRow("AL 9-13 yrs",                       report.commodities.al_9_13yrs);
    addRow("AL 14+ yrs",                        report.commodities.al_14_plus);
    addRow("DHAP 40/320mg",                     report.commodities.dhap_40_320mg);
    addRow("Quinine Tablets",                   report.commodities.quinine_tablet);
    addRow("Quinine Injection",                 report.commodities.quinine_injection);
    addRow("Artesunate Injection 30mg",         report.commodities.artesunate_injection_30mg);
    addRow("Artesunate Injection 60mg",         report.commodities.artesunate_injection_60mg);
    addRow("Artesunate Injection 120mg",        report.commodities.artesunate_injection_120mg);
    addRow("Arthemeter Injection 40mg",         report.commodities.arthemeter_injection_40mg);
    addRow("Arthemeter Injection 80mg",         report.commodities.arthemeter_injection_80mg);
    addRow("Rectal Artesunate 50mg",            report.commodities.rectal_artesunate_50mg);
    addRow("Rectal Artesunate 200mg",           report.commodities.rectal_artesunate_200mg);
    addRow("RDT Kits",                          report.commodities.rdt_kits);
    addRow("SP (Sulfadoxine-Pyrimethamine)",    report.commodities.sp);

    return rows.join('\n');
  }
}