// services/GHSFormAService.ts
// UNIFIED FORM A - Combines ANC, Delivery, and Postnatal data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FormAReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
    monthName: string;
  };
  facility: {
    name: string;
    district: string;
    region: string;
    ghfCode: string;
  };
  antenatal: {
    newRegistrants: number;
    totalAttendances: number;
    iptp: { dose1: number; dose2: number; dose3: number; dose4: number; dose5Plus: number };
    ttVaccination: { dose1: number; dose2: number; dose3: number; dose4: number; dose5: number; tt2Plus: number };
    itnDistributed: number;
    ironFolateGiven: number;
    malariaTested: number;
    malariaPositive: number;
    malariaTreated: number;
    highRisk: number;
    anaemiaAtBooking: number;
    referralsMade: number;
    firstVisits: number;
    fourthVisits: number;
    mothersBelow150cm: number;
    seenAt36Weeks: number;
  };
  delivery: {
    totalDeliveries: number;
    spontaneousVertex: number;
    assistedBreech: number;
    vacuum: number;
    forceps: number;
    caesareanSection: number;
    multiple: number;
    liveBirths: number;
    stillbirthsFresh: number;
    stillbirthsMacerated: number;
    neonatalDeaths: number;
    maternalDeaths: number;
    lowBirthWeight: number;
    hospitalDeliveries: number;
    healthCentreDeliveries: number;
    homeDeliveries: number;
    skilledAttendant: number;
    tbaAttendant: number;
  };
  postnatal: {
    newMothers: number;
    totalVisits: number;
    pncWithin48Hours: number;
    pncWithin6Weeks: number;
    familyPlanningAccepted: number;
    exclusiveBreastfeeding: number;
    immunizationGiven: number;
    complications: number;
  };
  generatedAt: Date;
}

export class GHSFormAService {
  
  static async generateFormAReport(startDate: Date, endDate: Date): Promise<FormAReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    const hospital = await prisma.hospital.findFirst();
    
    // ============================================
    // ANTENATAL DATA
    // ============================================
    
    const bookings = await prisma.antenatalBooking.findMany({
      where: { bookingDate: { gte: startDate, lte: endDateTime }, isActive: true }
    });
    
    const visits = await prisma.aNCVisit.findMany({
      where: { visitDate: { gte: startDate, lte: endDateTime } }
    });
    
    // Mothers below 150cm from vitals
    const shortMothers = await prisma.vitals.findMany({
      where: {
        recordedAt: { gte: startDate, lte: endDateTime },
        height: { lt: 150 }
      },
      distinct: ['patientId']
    });
    
    // ============================================
    // DELIVERY DATA
    // ============================================
    
    const deliveries = await prisma.deliveryRecord.findMany({
      where: { deliveryDate: { gte: startDate, lte: endDateTime } },
      include: { Newborn: true }
    });
    
    // ============================================
    // POSTNATAL DATA
    // ============================================
    
    const postnatalAttendances = await prisma.attendance.findMany({
      where: {
        attendanceType: 'postnatal',
        dateTime: { gte: startDate, lte: endDateTime },
        status: { not: 'cancelled' }
      },
      include: {
        Patient: true,
        Vitals: true,
        Medication: true
      }
    });
    
    // Calculate PNC timing
    const pncWithin48Hours = postnatalAttendances.filter(a => {
      const delivery = deliveries.find(d => d.patientId === a.patientId);
      if (!delivery) return false;
      const hoursDiff = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 48;
    }).length;
    
    const pncWithin6Weeks = postnatalAttendances.filter(a => {
      const delivery = deliveries.find(d => d.patientId === a.patientId);
      if (!delivery) return false;
      const daysDiff = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 42;
    }).length;
    
    // Family planning from medications
    const familyPlanningAccepted = await prisma.medication.count({
      where: {
        prescribedAt: { gte: startDate, lte: endDateTime },
        name: { contains: 'family planning', mode: 'insensitive' }
      }
    });
    
    // Exclusive breastfeeding from vitals notes
    const exclusiveBreastfeeding = await prisma.vitals.count({
      where: {
        recordedAt: { gte: startDate, lte: endDateTime },
        notes: { contains: 'exclusive breastfeeding', mode: 'insensitive' }
      }
    });
    
    // Immunizations given
    const immunizationGiven = await prisma.medication.count({
      where: {
        prescribedAt: { gte: startDate, lte: endDateTime },
        name: { contains: 'vaccine', mode: 'insensitive' }
      }
    });
    
    // Postnatal complications
    const complications = postnatalAttendances.filter(a => 
      a.medicalNotes?.toLowerCase().includes('complication') ||
      a.medicalNotes?.toLowerCase().includes('infection') ||
      a.medicalNotes?.toLowerCase().includes('haemorrhage') ||
      a.medicalNotes?.toLowerCase().includes('fever')
    ).length;
    
    return {
      period: {
        startDate,
        endDate,
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        monthName: startDate.toLocaleString('default', { month: 'long' })
      },
      facility: {
        name: hospital?.name || 'Health Facility',
        district: hospital?.ghsDistrictCode || 'Unknown',
        region: hospital?.address?.split(',')?.pop()?.trim() || 'Unknown',
        ghfCode: hospital?.ghaHFCode || 'Unknown'
      },
      antenatal: {
        newRegistrants: bookings.length,
        totalAttendances: visits.length,
        iptp: {
          dose1: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
          dose2: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
          dose3: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
          dose4: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
          dose5Plus: visits.filter(v => v.iptpGiven && v.iptpDoseNumber >= 5).length
        },
        ttVaccination: {
          dose1: visits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
          dose2: visits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
          dose3: visits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
          dose4: visits.filter(v => v.ttGiven && v.ttDoseNumber === 4).length,
          dose5: visits.filter(v => v.ttGiven && v.ttDoseNumber === 5).length,
          tt2Plus: visits.filter(v => v.ttGiven && v.ttDoseNumber >= 2).length
        },
        itnDistributed: visits.filter(v => v.itnGiven).length,
        ironFolateGiven: visits.filter(v => v.ironGiven || v.folateGiven).length,
        malariaTested: visits.filter(v => v.malariaTestDone).length,
        malariaPositive: visits.filter(v => v.malariaTestResult === 'Positive').length,
        malariaTreated: visits.filter(v => v.malariaTreatmentGiven).length,
        highRisk: bookings.filter(b => b.riskLevel === 'high').length,
        anaemiaAtBooking: bookings.filter(b => b.hbBooking && b.hbBooking < 11).length,
        referralsMade: visits.filter(v => v.referralMade).length,
        firstVisits: visits.filter(v => v.visitNumber === 1).length,
        fourthVisits: visits.filter(v => v.visitNumber === 4).length,
        mothersBelow150cm: shortMothers.length,
        seenAt36Weeks: visits.filter(v => v.gestationalAgeWeeks && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length
      },
      delivery: {
        totalDeliveries: deliveries.length,
        spontaneousVertex: deliveries.filter(d => d.deliveryType === 'spontaneous_vertex').length,
        assistedBreech: deliveries.filter(d => d.deliveryType === 'assisted_breech').length,
        vacuum: deliveries.filter(d => d.deliveryType === 'vacuum').length,
        forceps: deliveries.filter(d => d.deliveryType === 'forceps').length,
        caesareanSection: deliveries.filter(d => d.deliveryType === 'caesarean_section').length,
        multiple: deliveries.filter(d => d.deliveryType === 'multiple').length,
        liveBirths: deliveries.filter(d => d.deliveryOutcome === 'live_birth').length,
        stillbirthsFresh: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_fresh').length,
        stillbirthsMacerated: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_macerated').length,
        neonatalDeaths: deliveries.filter(d => d.deliveryOutcome === 'neonatal_death').length,
        maternalDeaths: deliveries.filter(d => d.maternalOutcome !== 'alive').length,
        lowBirthWeight: deliveries.filter(d => d.birthWeight && d.birthWeight < 2500).length,
        hospitalDeliveries: deliveries.filter(d => d.placeOfDelivery === 'hospital').length,
        healthCentreDeliveries: deliveries.filter(d => d.placeOfDelivery === 'health_centre' || d.placeOfDelivery === 'clinic').length,
        homeDeliveries: deliveries.filter(d => d.placeOfDelivery === 'home' || d.placeOfDelivery === 'en_route').length,
        skilledAttendant: deliveries.filter(d => d.attendant === 'Skilled' || d.attendant === 'Doctor' || d.attendant === 'Midwife').length,
        tbaAttendant: deliveries.filter(d => d.attendant === 'TBA').length
      },
      postnatal: {
        newMothers: deliveries.length,
        totalVisits: postnatalAttendances.length,
        pncWithin48Hours,
        pncWithin6Weeks,
        familyPlanningAccepted,
        exclusiveBreastfeeding,
        immunizationGiven,
        complications
      },
      generatedAt: new Date()
    };
  }
  
  static exportToCSV(report: FormAReport): string {
    const rows: string[] = [];
    
    rows.push(`"GHS FORM A - MATERNAL HEALTH REPORT"`);
    rows.push(`"Facility","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"Period","${report.period.monthName} ${report.period.year}"`);
    rows.push(``);
    
    rows.push(`"ANTENATAL CARE"`);
    rows.push(`"New Registrants",${report.antenatal.newRegistrants}`);
    rows.push(`"Total Attendances",${report.antenatal.totalAttendances}`);
    rows.push(`"IPTp-1",${report.antenatal.iptp.dose1}`);
    rows.push(`"IPTp-2",${report.antenatal.iptp.dose2}`);
    rows.push(`"IPTp-3",${report.antenatal.iptp.dose3}`);
    rows.push(`"IPTp-4",${report.antenatal.iptp.dose4}`);
    rows.push(`"IPTp-5+",${report.antenatal.iptp.dose5Plus}`);
    rows.push(`"TT2+ (Protected)",${report.antenatal.ttVaccination.tt2Plus}`);
    rows.push(`"ITN Distributed",${report.antenatal.itnDistributed}`);
    rows.push(`"Iron/Folate Given",${report.antenatal.ironFolateGiven}`);
    rows.push(`"Malaria Tested",${report.antenatal.malariaTested}`);
    rows.push(`"Malaria Positive",${report.antenatal.malariaPositive}`);
    rows.push(`"Malaria Treated",${report.antenatal.malariaTreated}`);
    rows.push(`"High Risk Pregnancies",${report.antenatal.highRisk}`);
    rows.push(`"Anaemia at Booking",${report.antenatal.anaemiaAtBooking}`);
    rows.push(`"Referrals Made",${report.antenatal.referralsMade}`);
    rows.push(``);
    
    rows.push(`"DELIVERY"`);
    rows.push(`"Total Deliveries",${report.delivery.totalDeliveries}`);
    rows.push(`"Spontaneous Vertex",${report.delivery.spontaneousVertex}`);
    rows.push(`"Caesarean Section",${report.delivery.caesareanSection}`);
    rows.push(`"Live Births",${report.delivery.liveBirths}`);
    rows.push(`"Stillbirths",${report.delivery.stillbirthsFresh + report.delivery.stillbirthsMacerated}`);
    rows.push(`"Neonatal Deaths",${report.delivery.neonatalDeaths}`);
    rows.push(`"Maternal Deaths",${report.delivery.maternalDeaths}`);
    rows.push(`"Low Birth Weight",${report.delivery.lowBirthWeight}`);
    rows.push(``);
    
    rows.push(`"POSTNATAL CARE"`);
    rows.push(`"New Mothers",${report.postnatal.newMothers}`);
    rows.push(`"Total PNC Visits",${report.postnatal.totalVisits}`);
    rows.push(`"PNC within 48 hours",${report.postnatal.pncWithin48Hours}`);
    rows.push(`"PNC within 6 weeks",${report.postnatal.pncWithin6Weeks}`);
    rows.push(`"Family Planning Accepted",${report.postnatal.familyPlanningAccepted}`);
    rows.push(`"Exclusive Breastfeeding",${report.postnatal.exclusiveBreastfeeding}`);
    rows.push(`"Immunizations Given",${report.postnatal.immunizationGiven}`);
    rows.push(`"Complications",${report.postnatal.complications}`);
    
    return rows.join('\n');
  }
}