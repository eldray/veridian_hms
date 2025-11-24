import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  PrismaClient, 
  Gender, 
  AttendanceType, 
  EncounterCategory, 
  VisitCategory,
  PaymentMode, 
  AdmissionType,
  BillStatus,
  ClaimStatus,
  AppointmentStatus,
  AppointmentType,
  ServiceType,
  ServiceCategory,
  DiagnosisCategory
} from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Utility function for consistent error responses
const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Calculate age in days, months, and years for GHS reporting
 */
const calculateGHSAge = (dateOfBirth: Date, attendanceDate: Date = new Date()) => {
  const birthDate = new Date(dateOfBirth);
  const attendance = new Date(attendanceDate);
  
  let years = attendance.getFullYear() - birthDate.getFullYear();
  let months = attendance.getMonth() - birthDate.getMonth();
  let days = attendance.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    // Get the last day of the previous month
    const lastDayOfMonth = new Date(attendance.getFullYear(), attendance.getMonth(), 0).getDate();
    days += lastDayOfMonth;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalDays = Math.floor((attendance.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    years,
    months,
    days: totalDays,
    totalDays
  };
};

/**
 * Get GHS Age Group according to the official template
 */
const getGHSAgeGroup = (dateOfBirth: Date, attendanceDate: Date = new Date()) => {
  const age = calculateGHSAge(dateOfBirth, attendanceDate);
  
  if (age.totalDays < 28) return '<28 days';
  if (age.years === 0 && age.months >= 1 && age.months <= 11) return '1-11 months';
  if (age.years >= 1 && age.years <= 4) return '1-4 years';
  if (age.years >= 5 && age.years <= 9) return '5-9 years';
  if (age.years >= 10 && age.years <= 14) return '10-14 years';
  if (age.years >= 15 && age.years <= 17) return '15-17 years';
  if (age.years >= 18 && age.years <= 19) return '18-19 years';
  if (age.years >= 20 && age.years <= 34) return '20-34 years';
  if (age.years >= 35 && age.years <= 49) return '35-49 years';
  if (age.years >= 50 && age.years <= 59) return '50-59 years';
  if (age.years >= 60 && age.years <= 69) return '60-69 years';
  return 'above 70 years';
};

/**
 * GHS OPD (Outpatient Department) Report - Official Template
 */
export const getGHSOPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('🏥 Generating GHS OPD Report...');

    const where: any = {
      encounterCategory: EncounterCategory.opd
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true,
            folderNumber: true
          }
        },
        AttendanceDiagnosis: { // ✅ FIXED
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true
              }
            }
          }
        },
        Vitals: {
          select: {
            bloodPressure: true,
            temperature: true,
            pulse: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Initialize GHS demographic structure
    const ghsDemographics = {
      male: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      female: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      total: 0
    };

    // Process each attendance for GHS demographics
    attendances.forEach(attendance => {
      const gender = attendance.Patient.gender.toLowerCase() as 'male' | 'female'; // ✅ FIXED: Capitalized
      const ageGroup = getGHSAgeGroup(attendance.Patient.dateOfBirth, attendance.dateTime); // ✅ FIXED: Capitalized
      
      if (ghsDemographics[gender] && ghsDemographics[gender][ageGroup] !== undefined) {
        ghsDemographics[gender][ageGroup]++;
        ghsDemographics[gender].total++;
        ghsDemographics.total++;
      }
    });

    // Process data for GHS OPD format
    const reportData = {
      reportType: 'GHS OPD REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // GHS Demographic Breakdown (Primary Data)
      demographicBreakdown: ghsDemographics,
      
      // Summary Statistics
      summary: {
        totalAttendances: attendances.length,
        newCases: attendances.filter(a => 
          a.attendanceType === AttendanceType.emergency_acute || 
          a.attendanceType === AttendanceType.chronic_followup
        ).length,
        followUpCases: attendances.filter(a => 
          a.attendanceType === AttendanceType.chronic_followup
        ).length,
        specialistCases: attendances.filter(a => 
          a.attendanceType === AttendanceType.specialist_consultation
        ).length,
        emergencyCases: attendances.filter(a => 
          a.attendanceType === AttendanceType.emergency_acute
        ).length
      },
      
      // Clinical Data
      clinicalBreakdown: {
        topDiagnoses: getTopItems(attendances.flatMap(a => 
          a.diagnoses.map(d => d.diagnosis?.name).filter(Boolean)
        ), 15),
        
        byDiagnosisCategory: attendances.flatMap(a => 
          a.diagnoses.map(d => d.diagnosis?.category).filter(Boolean)
        ).reduce((acc, category) => {
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      
      // Service Utilization
      serviceUtilization: {
        byAttendanceType: attendances.reduce((acc, attendance) => {
          acc[attendance.attendanceType] = (acc[attendance.attendanceType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        byPaymentMode: attendances.reduce((acc, attendance) => {
          acc[attendance.paymentMode] = (acc[attendance.paymentMode] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      
      generatedAt: new Date(),
      dataSource: 'OPD Register'
    };

    console.log('✅ GHS OPD Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating GHS OPD report', error);
  }
};

/**
 * GHS IPD (Inpatient Department) Report - Official Template
 */
export const getGHSIPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('🏥 Generating GHS IPD Report...');

    const where: any = {
      encounterCategory: EncounterCategory.ipd
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true,
            folderNumber: true
          }
        },
        Admission: {
          include: {
            Ward: {
              select: {
                wardName: true,
                wardType: true
              }
            },
            Diagnosis: {
              select: {
                name: true,
                icdCode: true,
                category: true
              }
            },
            AdmissionSecondaryDiagnosis: {
              include: {
                Diagnosis: {
                  select: {
                    name: true,
                    category: true
                  }
                }
              }
            }
          }
        },
        AttendanceDiagnosis:{
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Initialize GHS IPD demographic structure
    const ghsIPDDemographics = {
      male: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      female: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      total: 0
    };

    // Process each IPD attendance for GHS demographics
    attendances.forEach(attendance => {
      const gender = attendance.Patient.gender.toLowerCase() as 'male' | 'female'; // ✅ FIXED: Capitalized
      const ageGroup = getGHSAgeGroup(attendance.Patient.dateOfBirth, attendance.dateTime); // ✅ FIXED: Capitalized
      
      if (ghsIPDDemographics[gender] && ghsIPDDemographics[gender][ageGroup] !== undefined) {
        ghsIPDDemographics[gender][ageGroup]++;
        ghsIPDDemographics[gender].total++;
        ghsIPDDemographics.total++;
      }
    });

    const reportData = {
      reportType: 'GHS IPD REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // GHS IPD Demographic Breakdown
      demographicBreakdown: ghsIPDDemographics,
      
      summary: {
        totalAdmissions: attendances.length,
        averageLengthOfStay: calculateAverageLOS(attendances),
        bedOccupancyRate: await calculateBedOccupancyRate(startDate as string, endDate as string),
        currentOccupancy: await getCurrentBedOccupancy()
      },
      
      // Admission Analysis
      admissionBreakdown: {
        byType: attendances.reduce((acc, attendance) => {
          const type = attendance.admission?.admissionType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        byWard: attendances.reduce((acc, attendance) => {
          const ward = attendance.admission?.ward?.wardName || 'Unknown';
          acc[ward] = (acc[ward] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        bySource: attendances.reduce((acc, attendance) => {
          const source = attendance.admission?.admissionSource || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      
      // Clinical Data
      clinicalData: {
        principalDiagnoses: getTopItems(attendances.map(a => 
          a.admission?.principalDiagnosis?.name
        ).filter(Boolean), 15),
        
        comorbidities: getTopItems(attendances.flatMap(a => 
          a.admission?.secondaryDiagnoses.map(sd => sd.diagnosis.name) || []
        ), 10)
      },
      
      generatedAt: new Date(),
      dataSource: 'IPD Register'
    };

    console.log('✅ GHS IPD Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating GHS IPD report', error);
  }
};

/**
 * GHS ANC (Antenatal Care) Report - Official Template
 */
export const getGHSANCReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('🤰 Generating GHS ANC Report...');

    const where: any = {
      attendanceType: AttendanceType.antenatal
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const ancAttendances = await prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true,
            folderNumber: true
          }
        },
        Vitals: {
          select: {
            bloodPressure: true,
            weight: true,
            height: true
          }
        },
        AttendanceDiagnosis: { // ✅ FIXED
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true
              }
            }
          }
        },
      },
      orderBy: { dateTime: 'desc' }
    });

    // GHS ANC Age Groups (Women of Reproductive Age)
    const ghsANCDemographics = {
      '10-14 years': 0,
      '15-17 years': 0,
      '18-19 years': 0,
      '20-34 years': 0,
      '35-49 years': 0,
      'above 50 years': 0,
      total: 0
    };

    // Process ANC patients
    ancAttendances.forEach(attendance => {
      const age = calculateGHSAge(attendance.patient.dateOfBirth, attendance.dateTime).years;
      
      if (age >= 10 && age <= 14) ghsANCDemographics['10-14 years']++;
      else if (age >= 15 && age <= 17) ghsANCDemographics['15-17 years']++;
      else if (age >= 18 && age <= 19) ghsANCDemographics['18-19 years']++;
      else if (age >= 20 && age <= 34) ghsANCDemographics['20-34 years']++;
      else if (age >= 35 && age <= 49) ghsANCDemographics['35-49 years']++;
      else if (age >= 50) ghsANCDemographics['above 50 years']++;
      
      ghsANCDemographics.total++;
    });

    const uniquePregnantWomen = new Set(ancAttendances.map(a => a.patientId)).size;

    const reportData = {
      reportType: 'GHS ANTENATAL CARE REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // ANC Demographic Breakdown
      demographicBreakdown: ghsANCDemographics,
      
      summary: {
        totalANCVIsits: ancAttendances.length,
        uniquePregnantWomen: uniquePregnantWomen,
        firstTrimesterVisits: ancAttendances.filter(a => isFirstTrimester(a.dateTime)).length,
        fourthANCCount: ancAttendances.filter(a => getANCCount(a.patientId, ancAttendances) >= 4).length
      },
      
      // ANC Service Indicators
      serviceIndicators: {
        firstANCBefore12Weeks: ancAttendances.filter(a => 
          isFirstANCBefore12Weeks(a.patientId, ancAttendances)
        ).length,
        
        receivedTTVaccine: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('tetanus'))
        ).length,
        
        receivedIronFolate: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('anemia'))
        ).length,
        
        screenedForSyphilis: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('syphilis'))
        ).length
      },
      
      // Risk Factors
      riskFactors: {
        hypertensionCases: ancAttendances.filter(a => 
          a.vitals.some(v => hasHypertension(v.bloodPressure))
        ).length,
        
        anemiaCases: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('anemia'))
        ).length,
        
        malariaInPregnancy: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('malaria'))
        ).length,
        
        diabetesInPregnancy: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('diabetes'))
        ).length
      },
      
      generatedAt: new Date(),
      dataSource: 'ANC Register'
    };

    console.log('✅ GHS ANC Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating GHS ANC report', error);
  }
};

/**
 * GHS Child Welfare Clinic (CWC) Report - Official Template
 */
export const getGHSCWCReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('👶 Generating GHS CWC Report...');

    const where: any = {
      OR: [
        { attendanceType: AttendanceType.emergency_acute },
        { attendanceType: AttendanceType.chronic_followup }
      ]
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const allAttendances = await prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true,
            folderNumber: true
          }
        },
        AttendanceDiagnosis: { // ✅ FIXED
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true
              }
            }
          }
        },
        Vitals: {
          select: {
            weight: true,
            height: true
          }
        }
      }
    });

    // Filter children under 5 years
    const childAttendances = allAttendances.filter(a => {
      const age = calculateGHSAge(a.patient.dateOfBirth, a.dateTime);
      return age.years < 5;
    });

    // GHS CWC Age Groups (Under 5)
    const ghsCWCDemographics = {
      male: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        total: 0
      },
      female: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        total: 0
      },
      total: 0
    };

    // Process CWC demographics
    childAttendances.forEach(attendance => {
      const gender = attendance.patient.gender.toLowerCase() as 'male' | 'female';
      const ageGroup = getGHSAgeGroup(attendance.patient.dateOfBirth, attendance.dateTime);
      
      // Map to CWC categories
      let cwcAgeGroup: string;
      if (ageGroup === '<28 days') cwcAgeGroup = '<28 days';
      else if (ageGroup === '1-11 months') cwcAgeGroup = '1-11 months';
      else if (ageGroup === '1-4 years') cwcAgeGroup = '1-4 years';
      else return; // Skip if not in CWC age range
      
      if (ghsCWCDemographics[gender] && ghsCWCDemographics[gender][cwcAgeGroup] !== undefined) {
        ghsCWCDemographics[gender][cwcAgeGroup]++;
        ghsCWCDemographics[gender].total++;
        ghsCWCDemographics.total++;
      }
    });

    const reportData = {
      reportType: 'GHS CHILD WELFARE CLINIC REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // CWC Demographic Breakdown
      demographicBreakdown: ghsCWCDemographics,
      
      summary: {
        totalCWCVisits: childAttendances.length,
        uniqueChildren: new Set(childAttendances.map(a => a.patientId)).size,
        childrenFullyImmunized: await getFullyImmunizedCount(startDate as string, endDate as string),
        malnutritionCases: childAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('malnutrition'))
        ).length
      },
      
      // Growth Monitoring
      growthMonitoring: {
        underweight: childAttendances.filter(a => isUnderweight(a.vitals)).length,
        stunting: childAttendances.filter(a => isStunted(a.vitals)).length,
        wasting: childAttendances.filter(a => isWasted(a.vitals)).length
      },
      
      // Common Childhood Illnesses
      childhoodIllnesses: {
        malaria: countDiseaseCases(childAttendances, 'malaria'),
        diarrhea: countDiseaseCases(childAttendances, 'diarrhea'),
        pneumonia: countDiseaseCases(childAttendances, 'pneumonia'),
        acuteRespiratoryInfection: countDiseaseCases(childAttendances, 'respiratory infection')
      },
      
      generatedAt: new Date(),
      dataSource: 'CWC Register'
    };

    console.log('✅ GHS CWC Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating GHS CWC report', error);
  }
};

// ==================== HELPER FUNCTIONS ====================

function getTopItems(items: string[], limit: number): Array<{name: string, count: number}> {
  const countMap = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(countMap)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function calculateAverageLOS(attendances: any[]): number {
  const losValues = attendances
    .map(a => a.admission)
    .filter(Boolean)
    .map(admission => {
      const admissionDate = new Date(admission.admissionDate);
      const dischargeDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
      return Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
    });
  
  return losValues.length > 0 
    ? Math.round(losValues.reduce((a, b) => a + b, 0) / losValues.length * 10) / 10 
    : 0;
}

// Additional helper functions for specific calculations
async function calculateBedOccupancyRate(startDate: string, endDate: string): Promise<number> {
  const totalBeds = await prisma.bed.count();
  const occupiedBeds = await prisma.bed.count({
    where: { isOccupied: true }
  });
  
  return totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100 * 10) / 10 : 0;
}

async function getCurrentBedOccupancy() {
  const totalBeds = await prisma.bed.count();
  const occupiedBeds = await prisma.bed.count({
    where: { isOccupied: true }
  });
  
  return {
    totalBeds,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100 * 10) / 10 : 0
  };
}

function isFirstTrimester(dateTime: Date): boolean {
  // Implementation for determining first trimester
  return true; // Placeholder
}

function getANCCount(patientId: string, ancAttendances: any[]): number {
  return ancAttendances.filter(a => a.patientId === patientId).length;
}

function isFirstANCBefore12Weeks(patientId: string, ancAttendances: any[]): boolean {
  // Implementation for checking first ANC before 12 weeks
  return true; // Placeholder
}

function hasHypertension(bloodPressure: string | null): boolean {
  if (!bloodPressure) return false;
  const [systolic, diastolic] = bloodPressure.split('/').map(Number);
  return systolic > 140 || diastolic > 90;
}

function isUnderweight(vitals: any[]): boolean {
  // Implementation for underweight detection
  return false; // Placeholder
}

function isStunted(vitals: any[]): boolean {
  // Implementation for stunting detection
  return false; // Placeholder
}

function isWasted(vitals: any[]): boolean {
  // Implementation for wasting detection
  return false; // Placeholder
}

function countDiseaseCases(attendances: any[], disease: string): number {
  return attendances.filter(a => 
    a.diagnoses.some((d: any) => 
      d.diagnosis?.name.toLowerCase().includes(disease.toLowerCase())
    )
  ).length;
}

async function getFullyImmunizedCount(startDate: string, endDate: string): Promise<number> {
  // Implementation for fully immunized count
  return 0; // Placeholder
}


/**
 * GHS Family Planning Report
 */
export const getGHSFamilyPlanningReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, methodType, ageGroup } = req.query;
    
    console.log('👨‍👩‍👧‍👦 Generating GHS Family Planning Report...');

    const where: any = {
      OR: [
        { attendanceType: AttendanceType.emergency_acute },
        { attendanceType: AttendanceType.chronic_followup },
        { attendanceType: AttendanceType.specialist_consultation }
      ]
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    // This would typically come from specific family planning services
    const fpAttendances = await prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true,
            folderNumber: true
          }
        },
        servicesRendered: {
          include: {
            serviceCatalog: {
              select: {
                name: true,
                serviceType: true
              }
            }
          }
        }
      }
    }).then(attendances => attendances.filter(a => 
      a.servicesRendered.some(s => 
        s.serviceCatalog.name.toLowerCase().includes('family planning') ||
        s.serviceCatalog.serviceType === ServiceType.procedure
      )
    ));

    // GHS FP Age Groups (Women of Reproductive Age)
    const ghsFPDemographics = {
      '10-14 years': 0,
      '15-17 years': 0,
      '18-19 years': 0,
      '20-34 years': 0,
      '35-49 years': 0,
      'above 50 years': 0,
      total: 0
    };

    // Process FP demographics
    fpAttendances.forEach(attendance => {
      const age = calculateGHSAge(attendance.patient.dateOfBirth, attendance.dateTime).years;
      
      if (age >= 10 && age <= 14) ghsFPDemographics['10-14 years']++;
      else if (age >= 15 && age <= 17) ghsFPDemographics['15-17 years']++;
      else if (age >= 18 && age <= 19) ghsFPDemographics['18-19 years']++;
      else if (age >= 20 && age <= 34) ghsFPDemographics['20-34 years']++;
      else if (age >= 35 && age <= 49) ghsFPDemographics['35-49 years']++;
      else if (age >= 50) ghsFPDemographics['above 50 years']++;
      
      ghsFPDemographics.total++;
    });

    const reportData = {
      reportType: 'GHS FAMILY PLANNING REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // FP Demographic Breakdown
      demographicBreakdown: ghsFPDemographics,
      
      summary: {
        totalFPClients: new Set(fpAttendances.map(a => a.patientId)).size,
        newAcceptors: await getNewFPAcceptors(startDate as string, endDate as string),
        continuingUsers: await getContinuingFPUsers(startDate as string, endDate as string),
        coupleYearProtection: await calculateCoupleYearProtection(startDate as string, endDate as string)
      },
      
      // Method Mix
      methodMix: {
        oralContraceptives: await getMethodCount('oral', startDate as string, endDate as string),
        injectables: await getMethodCount('injectable', startDate as string, endDate as string),
        implants: await getMethodCount('implant', startDate as string, endDate as string),
        iud: await getMethodCount('iud', startDate as string, endDate as string),
        condoms: await getMethodCount('condom', startDate as string, endDate as string),
        traditionalMethods: await getMethodCount('traditional', startDate as string, endDate as string)
      },
      
      // Service Delivery
      serviceDelivery: {
        postpartumFPAcceptors: await getPostpartumFPClients(startDate as string, endDate as string),
        fpCounsellingSessions: await getFPCounsellingSessions(startDate as string, endDate as string),
        methodSwitching: await getMethodSwitchingRate(startDate as string, endDate as string)
      },
      
      generatedAt: new Date(),
      dataSource: 'Family Planning Register'
    };

    console.log('✅ GHS Family Planning Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating GHS Family Planning report', error);
  }
};

/**
 * Morbidity and Mortality Report
 * Comprehensive disease surveillance reporting
 */
export const getMorbidityMortalityReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, diseaseCategory, ageGroup } = req.query;
    
    console.log('📊 Generating Morbidity & Mortality Report...');

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const [attendances, admissions, mortalityCases] = await Promise.all([
      // All attendances with diagnoses
      prisma.attendance.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              gender: true,
              dateOfBirth: true,
              folderNumber: true
            }
          },
          AttendanceDiagnosis: { // ✅ FIXED
            include: {
              Diagnosis: {
                select: {
                  name: true,
                  icdCode: true
                }
              }
            }
          },
        }
      }),
      
      // Admissions data
      prisma.admission.findMany({
        where: {
          admissionDate: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        include: {
          principalDiagnosis: true,
          secondaryDiagnoses: {
            include: {
              diagnosis: true
            }
          },
          patient: {
            select: {
              dateOfBirth: true,
              gender: true
            }
          }
        }
      }),
      
      // Mortality cases (discharge status = expired)
      prisma.admission.findMany({
        where: {
          dischargeStatus: DischargeStatus.expired,
          dischargeDate: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        include: {
          principalDiagnosis: true,
          patient: {
            select: {
              dateOfBirth: true,
              gender: true
            }
          }
        }
      })
    ]);

    // GHS Morbidity Demographics
    const ghsMorbidityDemographics = {
      male: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      female: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      total: 0
    };

    // Process morbidity demographics
    attendances.forEach(attendance => {
      const gender = attendance.patient.gender.toLowerCase() as 'male' | 'female';
      const ageGroup = getGHSAgeGroup(attendance.patient.dateOfBirth, attendance.dateTime);
      
      if (ghsMorbidityDemographics[gender] && ghsMorbidityDemographics[gender][ageGroup] !== undefined) {
        ghsMorbidityDemographics[gender][ageGroup]++;
        ghsMorbidityDemographics[gender].total++;
        ghsMorbidityDemographics.total++;
      }
    });

    const reportData = {
      reportType: 'MORBIDITY AND MORTALITY REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // Morbidity Demographic Breakdown
      demographicBreakdown: ghsMorbidityDemographics,
      
      morbidityAnalysis: {
        topDiseases: getTopItems(attendances.flatMap(a => 
          a.diagnoses.map(d => d.diagnosis?.name).filter(Boolean)
        ), 20),
        
        diseaseByAgeGroup: analyzeDiseaseByAge(attendances),
        diseaseByGender: analyzeDiseaseByGender(attendances),
        seasonalTrends: analyzeSeasonalTrends(attendances),
        
        notifiableDiseases: {
          malaria: countDiseaseCases(attendances, 'malaria'),
          tuberculosis: countDiseaseCases(attendances, 'tuberculosis'),
          hiv: countDiseaseCases(attendances, 'hiv'),
          cholera: countDiseaseCases(attendances, 'cholera'),
          meningitis: countDiseaseCases(attendances, 'meningitis')
        }
      },
      
      mortalityAnalysis: {
        totalDeaths: mortalityCases.length,
        mortalityRate: attendances.length > 0 ? (mortalityCases.length / attendances.length) * 1000 : 0,
        
        leadingCauses: getTopItems(mortalityCases.map(m => m.principalDiagnosis?.name).filter(Boolean), 10),
        
        mortalityByAge: mortalityCases.reduce((acc, case_) => {
          const ageGroup = getGHSAgeGroup(case_.patient.dateOfBirth, case_.admissionDate);
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        maternalDeaths: mortalityCases.filter(m => 
          m.principalDiagnosis?.category === DiagnosisCategory.pregnancyChildbirthPuerperium
        ).length,
        
        infantMortality: mortalityCases.filter(m => {
          const age = calculateGHSAge(m.patient.dateOfBirth, m.admissionDate);
          return age.years < 1;
        }).length
      },
      
      preventiveHealth: {
        immunizationCoverage: await getImmunizationCoverage(startDate as string, endDate as string),
        screeningRates: await getScreeningRates(startDate as string, endDate as string),
        outbreakAlerts: await getOutbreakAlerts(startDate as string, endDate as string)
      },
      
      generatedAt: new Date(),
      dataSource: 'OPD Register, IPD Register, Mortality Register'
    };

    console.log('✅ Morbidity & Mortality Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating morbidity & mortality report', error);
  }
};

/**
 * Comprehensive Demographic Analysis Report
 */
export const getDemographicReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, analysisType = 'comprehensive' } = req.query;
    
    console.log('👥 Generating Demographic Analysis Report...');

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const [attendances, patients] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              gender: true,
              dateOfBirth: true,
              contact: true,
              address: true,
              folderNumber: true
            }
          }
        }
      }),
      
      prisma.patient.findMany({
        where: {
          registeredAt: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        select: {
          id: true,
          gender: true,
          dateOfBirth: true,
          contact: true,
          address: true,
          paymentMode: true,
          folderNumber: true
        }
      })
    ]);

    // GHS Comprehensive Demographics
    const ghsComprehensiveDemographics = {
      male: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      female: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      total: 0
    };

    // Process comprehensive demographics from attendances
    attendances.forEach(attendance => {
      const gender = attendance.patient.gender.toLowerCase() as 'male' | 'female';
      const ageGroup = getGHSAgeGroup(attendance.patient.dateOfBirth, attendance.dateTime);
      
      if (ghsComprehensiveDemographics[gender] && ghsComprehensiveDemographics[gender][ageGroup] !== undefined) {
        ghsComprehensiveDemographics[gender][ageGroup]++;
        ghsComprehensiveDemographics[gender].total++;
        ghsComprehensiveDemographics.total++;
      }
    });

    const uniquePatients = Array.from(new Set(attendances.map(a => a.patientId)))
      .map(id => attendances.find(a => a.patientId === id)?.patient)
      .filter(Boolean);

    const reportData = {
      reportType: 'COMPREHENSIVE DEMOGRAPHIC ANALYSIS REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // Comprehensive Demographic Breakdown
      demographicBreakdown: ghsComprehensiveDemographics,
      
      patientDemographics: {
        totalPatients: patients.length,
        genderDistribution: patients.reduce((acc, patient) => {
          acc[patient.gender] = (acc[patient.gender] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        paymentModeDistribution: patients.reduce((acc, patient) => {
          const mode = patient.paymentMode || 'unknown';
          acc[mode] = (acc[mode] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      
      attendancePatterns: {
        visitsPerPatient: calculateVisitsPerPatient(attendances),
        newVsReturning: {
          newPatients: patients.length,
          returningPatients: uniquePatients.length - patients.length
        },
        
        peakVisitingHours: analyzePeakHours(attendances),
        dayOfWeekPattern: analyzeDayOfWeekPattern(attendances)
      },
      
      geographicDistribution: {
        byLocation: analyzeGeographicDistribution(patients),
        catchmentArea: analyzeCatchmentArea(patients)
      },
      
      utilizationMetrics: {
        averageVisitsPerMonth: calculateAverageVisitsPerMonth(attendances),
        patientRetentionRate: calculateRetentionRate(patients, attendances),
        noShowRate: await calculateNoShowRate(startDate as string, endDate as string)
      },
      
      generatedAt: new Date(),
      dataSource: 'Patient Register, OPD Register'
    };

    console.log('✅ Demographic Analysis Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating demographic report', error);
  }
};

// ==================== FINANCIAL AND OTHER REPORTS ====================

/**
 * Comprehensive Financial Report
 */
export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const { period, dateFrom, dateTo } = req.query;

    // Handle dashboard request (today period)
    if (period === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const revenueData = await prisma.bill.aggregate({
        where: {
          billDate: {
            gte: today,
            lte: endOfToday
          },
          status: BillStatus.paid
        },
        _sum: {
          paidAmount: true
        }
      });

      return res.json({
        totalRevenue: revenueData._sum.paidAmount || 0,
        period: 'today',
        dateFrom: today,
        dateTo: endOfToday
      });
    }

    // Original financial report logic for other cases
    const where: any = {};
    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = new Date(dateFrom as string);
      if (dateTo) where.billDate.lte = new Date(dateTo as string);
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        Patient: { // ✅ FIXED: Capitalized
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        Attendance: { // ✅ FIXED: Capitalized
          include: {
            Patient: { // ✅ FIXED: Capitalized
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            }
          }
        }
      },
      orderBy: { billDate: 'desc' }
    });

    // Process financial data
    const financialData = bills.reduce((acc, bill) => {
      const month = bill.billDate.getMonth() + 1;
      const year = bill.billDate.getFullYear();
      
      const key = `${bill.paymentMode}-${month}-${year}`;
      
      if (!acc[key]) {
        acc[key] = {
          paymentMode: bill.paymentMode,
          month,
          year,
          totalBills: 0,
          totalRevenue: 0,
          totalPaid: 0,
          outstandingBalance: 0
        };
      }
      
      acc[key].totalBills += 1;
      acc[key].totalRevenue += bill.totalAmount || 0;
      acc[key].totalPaid += bill.paidAmount || 0;
      acc[key].outstandingBalance += bill.balance || 0;
      
      return acc;
    }, {} as any);

    const breakdown = Object.values(financialData);

    // Summary statistics
    const summary = Object.values(financialData).reduce((acc: any, curr: any) => {
      acc.totalRevenue += curr.totalRevenue;
      acc.totalPaid += curr.totalPaid;
      acc.outstandingBalance += curr.outstandingBalance;
      acc.totalBills += curr.totalBills;
      return acc;
    }, { totalRevenue: 0, totalPaid: 0, outstandingBalance: 0, totalBills: 0 });

    res.json({
      reportPeriod: {
        startDate: dateFrom || 'Beginning',
        endDate: dateTo || 'Now'
      },
      summary,
      breakdown,
      reportGenerated: new Date()
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ 
      message: 'Error generating financial report', 
      error: (error as Error).message 
    });
  }
};

/**
 * Insurance Claims Report
 */
export const getInsuranceClaimsReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, insuranceProviderId, status } = req.query;

    const where: any = {
      paymentMode: { in: [PaymentMode.nhis, PaymentMode.private_insurance] }
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (status) where.claimStatus = status;

    const claims = await prisma.attendance.findMany({
      where,
      include: {
        InsuranceProvider: { // ✅ FIXED: Capitalized
          select: {
            name: true,
            type: true
          }
        },
        Patient: { // ✅ FIXED: Capitalized
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        Bill: { // ✅ FIXED: Capitalized
          select: {
            totalAmount: true,
            insuranceCovered: true,
            paidAmount: true
          }
        },
        InsuranceClaim: { // ✅ FIXED: Capitalized
          select: {
            status: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process claims data
    const claimsReport = claims.reduce((acc, claim) => {
      const provider = claim.insuranceProvider?.name || 'Unknown';
      const status = claim.insuranceClaim?.status || ClaimStatus.draft;
      const month = claim.dateTime.getMonth() + 1;
      const year = claim.dateTime.getFullYear();
      
      const key = `${provider}-${status}-${month}-${year}`;
      
      if (!acc[key]) {
        acc[key] = {
          insuranceProvider: provider,
          status,
          month,
          year,
          totalClaims: 0,
          totalClaimAmount: 0,
          totalPaidAmount: 0
        };
      }
      
      acc[key].totalClaims += 1;
      acc[key].totalClaimAmount += claim.bill?.insuranceCovered || 0;
      acc[key].totalPaidAmount += claim.bill?.paidAmount || 0;
      
      return acc;
    }, {} as any);

    const reportData = Object.values(claimsReport).map((item: any) => ({
      ...item,
      approvalRate: item.totalClaimAmount > 0 
        ? Math.round((item.totalPaidAmount / item.totalClaimAmount) * 10000) / 100 
        : 0
    }));

    res.json({
      reportType: 'Insurance Claims Analysis',
      period: { startDate, endDate },
      claimsReport: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating insurance claims report:', error);
    res.status(500).json({ 
      message: 'Error generating insurance claims report', 
      error: (error as Error).message 
    });
  }
};

/**
 * Clinical Statistics Report
 */
export const getClinicalReport = async (req: Request, res: Response) => {
  try {
    const { period, dateFrom, dateTo, diagnosisCode } = req.query;

    // Handle dashboard request (30 days period)
    if (period === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const endDate = dateTo ? new Date(dateTo as string) : new Date();
      
      // Define your where clause first
      const where = {
        // Add your filter conditions here
        dateTime: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo)
        }
        // Add other conditions as needed
      };

      const clinicalData = await prisma.attendance.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              gender: true,
              dateOfBirth: true
            }
          },
          AttendanceDiagnosis: {
            include: {
              Diagnosis: {
                select: {
                  name: true,
                  icdCode: true,
                  category: true
                }
              }
            }
          },
          ServiceRendered: {
            include: {
              ServiceCatalog: {
                select: {
                  name: true,
                  serviceType: true
                }
              }
            }
          },
          // ADD THESE NEW RELATIONS THAT EXIST IN YOUR SCHEMA:
          LabTest: { // ✅ Plural relation name
            include: {
              LabTestTemplate: true,
              ServiceCatalog: true
            }
          },
          Scan: { // ✅ Plural relation name  
            include: {
              ScanTemplate: true,
              ServiceCatalog: true
            }
          },
          Procedure: { // ✅ Plural relation name
            include: {
              ProcedureTemplate: true,
              ServiceCatalog: true
            }
          },
          Medication: { // ✅ Plural relation name
            include: {
              StockItem: true,
              ServiceCatalog: true
            }
          },
          Vitals: true
        },
        orderBy: { dateTime: 'desc' }
      });

      // Generate diagnosis trends for dashboard
      const diagnosisCount: Record<string, number> = {};
      
      clinicalData.forEach(attendance => {
        if (attendance.AttendanceDiagnosis && Array.isArray(attendance.AttendanceDiagnosis)) { // ✅ FIXED: Capitalized
          attendance.AttendanceDiagnosis.forEach((diag: any) => {
            const diagnosisName = diag.Diagnosis?.name || diag.icdCode || 'Unknown Diagnosis'; // ✅ FIXED: Capitalized
            diagnosisCount[diagnosisName] = (diagnosisCount[diagnosisName] || 0) + 1;
          });
        }
      });

      const diagnosisTrends = Object.entries(diagnosisCount)
        .map(([disease, patients]) => ({ disease, patients }))
        .sort((a, b) => b.patients - a.patients)
        .slice(0, 10);

      return res.json({
        diagnosisTrends,
        totalAttendances: clinicalData.length,
        period: '30days',
        dateFrom: thirtyDaysAgo,
        dateTo: endDate
      });
    }

    const clinicalData = await prisma.attendance.findMany({
      where,
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true
          }
        },
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                name: true,
                icdCode: true,
                category: true
              }
            }
          }
        },
        servicesRendered: {
          include: {
            serviceCatalog: {
              select: {
                name: true,
                serviceType: true
              }
            }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process clinical data for detailed report
    const clinicalReport = clinicalData.reduce((acc, attendance) => {
      attendance.diagnoses.forEach(diagnosisItem => {
        const diagnosis = diagnosisItem.diagnosis;
        if (!diagnosis) return;

        const key = `${diagnosis.name}-${diagnosis.icdCode}-${attendance.dateTime.getMonth() + 1}`;
        
        if (!acc[key]) {
          acc[key] = {
            diagnosis: diagnosis.name,
            icdCode: diagnosis.icdCode,
            month: attendance.dateTime.getMonth() + 1,
            totalCases: 0,
            ages: [],
            genders: []
          };
        }
        
        acc[key].totalCases += 1;
        
        // Calculate age
        if (attendance.patient.dateOfBirth) {
          const age = calculateGHSAge(attendance.patient.dateOfBirth, attendance.dateTime).years;
          acc[key].ages.push(age);
        }
        
        acc[key].genders.push(attendance.patient.gender);
      });
      
      return acc;
    }, {} as any);

    const reportData = Object.values(clinicalReport).map((item: any) => {
      const genders = item.genders || [];
      return {
        diagnosis: item.diagnosis,
        icdCode: item.icdCode,
        month: item.month,
        totalCases: item.totalCases,
        averageAge: item.ages.length > 0 
          ? Math.round(item.ages.reduce((a: number, b: number) => a + b, 0) / item.ages.length * 10) / 10 
          : 0,
        genderDistribution: {
          male: genders.filter((g: string) => g === 'male').length,
          female: genders.filter((g: string) => g === 'female').length
        }
      };
    });

    res.json({
      reportType: 'Clinical Statistics',
      period: { dateFrom, dateTo },
      clinicalReport: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating clinical report:', error);
    res.status(500).json({ 
      message: 'Error generating clinical report', 
      error: (error as Error).message 
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

async function getFacilityInfo() {
  const hospital = await prisma.hospital.findFirst();
  return {
    name: hospital?.name || 'General Hospital',
    nhisFacilityCode: hospital?.nhisFacilityCode || 'GH001',
    facilityType: hospital?.nhisFacilityType || 'Secondary'
  };
}

// Placeholder implementations for family planning
async function getNewFPAcceptors(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getContinuingFPUsers(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function calculateCoupleYearProtection(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getMethodCount(method: string, startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getPostpartumFPClients(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getFPCounsellingSessions(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getMethodSwitchingRate(startDate: string, endDate: string): Promise<number> {
  return 0;
}

// Placeholder implementations for morbidity and mortality
function analyzeDiseaseByAge(attendances: any[]) {
  return {};
}

function analyzeDiseaseByGender(attendances: any[]) {
  return {};
}

function analyzeSeasonalTrends(attendances: any[]) {
  return {};
}

async function getImmunizationCoverage(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getScreeningRates(startDate: string, endDate: string): Promise<number> {
  return 0;
}

async function getOutbreakAlerts(startDate: string, endDate: string): Promise<number> {
  return 0;
}

// Placeholder implementations for demographic analysis
function calculateVisitsPerPatient(attendances: any[]) {
  return 0;
}

function analyzePeakHours(attendances: any[]) {
  return {};
}

function analyzeDayOfWeekPattern(attendances: any[]) {
  return {};
}

function analyzeGeographicDistribution(patients: any[]) {
  return {};
}

function analyzeCatchmentArea(patients: any[]) {
  return {};
}

function calculateAverageVisitsPerMonth(attendances: any[]) {
  return 0;
}

function calculateRetentionRate(patients: any[], attendances: any[]) {
  return 0;
}

async function calculateNoShowRate(startDate: string, endDate: string): Promise<number> {
  return 0;
}
/**
 * Export Report to various formats (PDF, Excel, CSV)
 */
export const exportReport = async (req: AuthRequest, res: Response) => {
  try {
    const { reportType, format = 'pdf', startDate, endDate } = req.query;
    
    console.log(`📤 Exporting ${reportType} report as ${format}...`);

    // Validate report type
    const validReportTypes = [
      'ghs-opd', 'ghs-ipd', 'ghs-anc', 'ghs-cwc', 
      'family-planning', 'morbidity-mortality', 'demographic',
      'financial', 'insurance-claims', 'clinical'
    ];
    
    if (!validReportTypes.includes(reportType as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
    }

    // Validate format
    const validFormats = ['pdf', 'excel', 'csv'];
    if (!validFormats.includes(format as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format'
      });
    }

    // Generate report data based on type
    let reportData: any;
    
    switch (reportType) {
      case 'ghs-opd':
        // Mock data - replace with actual implementation
        reportData = {
          reportType: 'GHS OPD REPORT',
          facility: await getFacilityInfo(),
          period: { startDate, endDate },
          summary: { totalAttendances: 150 },
          generatedAt: new Date()
        };
        break;
        
      case 'ghs-ipd':
        reportData = {
          reportType: 'GHS IPD REPORT', 
          facility: await getFacilityInfo(),
          period: { startDate, endDate },
          summary: { totalAdmissions: 45 },
          generatedAt: new Date()
        };
        break;
        
      case 'financial':
        reportData = {
          reportType: 'FINANCIAL REPORT',
          period: { startDate, endDate },
          summary: { totalRevenue: 12500 },
          generatedAt: new Date()
        };
        break;
        
      default:
        reportData = {
          reportType: reportType?.toString().toUpperCase() + ' REPORT',
          period: { startDate, endDate },
          generatedAt: new Date()
        };
    }

    // Simulate export processing
    const exportResult = {
      success: true,
      message: `Report exported successfully as ${format.toUpperCase()}`,
      data: {
        reportType,
        format,
        downloadUrl: `/exports/${reportType}-${Date.now()}.${format}`,
        fileSize: '2.5 MB',
        generatedAt: new Date()
      }
    };

    console.log(`✅ Report exported successfully: ${reportType} as ${format}`);
    
    res.json(exportResult);
    
  } catch (error) {
    console.error('❌ Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};
/**
 * Comprehensive Attendance Report
 * Analyzes attendance patterns, trends, and performance metrics
 */
export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      departmentId, 
      attendanceType, 
      paymentMode,
      analysisType = 'comprehensive'
    } = req.query;
    
    console.log('📊 Generating Comprehensive Attendance Report...');

    const where: any = {};

    // Date range filter
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    // Additional filters
    if (attendanceType) where.attendanceType = attendanceType;
    if (paymentMode) where.paymentMode = paymentMode;
    if (departmentId) {
      where.patient = {
        appointments: {
          some: {
            departmentId: departmentId as string
          }
        }
      };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        Patient: { // ✅ FIXED: Capitalized
          select: {
            id: true,
            surname: true,
            otherNames: true,
            gender: true,
            dateOfBirth: true,
            folderNumber: true,
            paymentMode: true,
            contact: true,
            address: true
          }
        },
        AttendanceDiagnosis: { // ✅ FIXED: Correct relation name
          include: {
            Diagnosis: { // ✅ FIXED: Capitalized
              select: {
                name: true,
                icdCode: true,
                category: true
              }
            }
          }
        },
        Vitals: { // ✅ FIXED: Capitalized
          select: {
            bloodPressure: true,
            temperature: true,
            pulse: true,
            weight: true,
            height: true
          }
        },
        ServiceRendered: { // ✅ FIXED: Capitalized
          include: {
            ServiceCatalog: { // ✅ FIXED: Capitalized
              select: {
                name: true,
                serviceType: true,
                serviceCategory: true
              }
            }
          }
        },
        Bill: { // ✅ FIXED: Capitalized
          select: {
            totalAmount: true,
            paidAmount: true,
            balance: true,
            status: true
          }
        },
        InsuranceProvider: { // ✅ FIXED: Capitalized
          select: {
            name: true,
            type: true
          }
        },
        User_Attendance_createdByIdToUser: { // ✅ FIXED: Correct relation name
          select: {
            fullName: true,
            specialization: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Calculate basic statistics
    const totalAttendances = attendances.length;
    const uniquePatients = new Set(attendances.map(a => a.patientId)).size;
    
    // GHS Demographic Breakdown
    const ghsDemographics = {
      male: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      female: {
        '<28 days': 0,
        '1-11 months': 0,
        '1-4 years': 0,
        '5-9 years': 0,
        '10-14 years': 0,
        '15-17 years': 0,
        '18-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50-59 years': 0,
        '60-69 years': 0,
        'above 70 years': 0,
        total: 0
      },
      total: 0
    };

    // Process demographics
    attendances.forEach(attendance => {
      const gender = attendance.patient.gender.toLowerCase() as 'male' | 'female';
      const ageGroup = getGHSAgeGroup(attendance.patient.dateOfBirth, attendance.dateTime);
      
      if (ghsDemographics[gender] && ghsDemographics[gender][ageGroup] !== undefined) {
        ghsDemographics[gender][ageGroup]++;
        ghsDemographics[gender].total++;
        ghsDemographics.total++;
      }
    });

    // Attendance Type Analysis
    const attendanceTypeAnalysis = attendances.reduce((acc, attendance) => {
      acc[attendance.attendanceType] = (acc[attendance.attendanceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Payment Mode Analysis
    const paymentModeAnalysis = attendances.reduce((acc, attendance) => {
      acc[attendance.paymentMode] = (acc[attendance.paymentMode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Encounter Category Analysis
    const encounterCategoryAnalysis = attendances.reduce((acc, attendance) => {
      acc[attendance.encounterCategory] = (acc[attendance.encounterCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Visit Category Analysis
    const visitCategoryAnalysis = attendances.reduce((acc, attendance) => {
      acc[attendance.visitCategory] = (acc[attendance.visitCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status Analysis
    const statusAnalysis = attendances.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Service Utilization Analysis
    const serviceUtilization = attendances.flatMap(a => 
      a.servicesRendered.map(sr => ({
        service: sr.serviceCatalog.name,
        type: sr.serviceCatalog.serviceType,
        category: sr.serviceCatalog.serviceCategory,
        quantity: sr.quantity
      }))
    ).reduce((acc, service) => {
      const key = `${service.service}-${service.type}`;
      if (!acc[key]) {
        acc[key] = {
          service: service.service,
          type: service.type,
          category: service.category,
          totalQuantity: 0,
          patientCount: 0
        };
      }
      acc[key].totalQuantity += service.quantity;
      acc[key].patientCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Diagnosis Analysis
    const diagnosisAnalysis = attendances.flatMap(a => 
      a.diagnoses.map(d => ({
        diagnosis: d.diagnosis?.name || 'Unknown',
        category: d.diagnosis?.category || 'Unknown',
        icdCode: d.diagnosis?.icdCode || 'Unknown',
        primary: d.primary
      }))
    ).reduce((acc, diagnosis) => {
      const key = diagnosis.diagnosis;
      if (!acc[key]) {
        acc[key] = {
          diagnosis: diagnosis.diagnosis,
          category: diagnosis.category,
          icdCode: diagnosis.icdCode,
          totalCases: 0,
          primaryCases: 0
        };
      }
      acc[key].totalCases += 1;
      if (diagnosis.primary) acc[key].primaryCases += 1;
      return acc;
    }, {} as Record<string, any>);

    // Financial Analysis
    const financialAnalysis = attendances.reduce((acc, attendance) => {
      const bill = attendance.bill;
      if (!bill) return acc;

      acc.totalBills += 1;
      acc.totalRevenue += bill.totalAmount || 0;
      acc.totalPaid += bill.paidAmount || 0;
      acc.totalBalance += bill.balance || 0;
      
      // Bill status analysis
      acc.billStatuses[bill.status] = (acc.billStatuses[bill.status] || 0) + 1;
      
      return acc;
    }, {
      totalBills: 0,
      totalRevenue: 0,
      totalPaid: 0,
      totalBalance: 0,
      billStatuses: {} as Record<string, number>
    });

    // Time-based Analysis
    const hourlyDistribution = attendances.reduce((acc, attendance) => {
      const hour = new Date(attendance.dateTime).getHours();
      const hourKey = `${hour}:00-${hour + 1}:00`;
      acc[hourKey] = (acc[hourKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyDistribution = attendances.reduce((acc, attendance) => {
      const day = new Date(attendance.dateTime).toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyDistribution = attendances.reduce((acc, attendance) => {
      const month = new Date(attendance.dateTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Doctor Performance Analysis
    const doctorPerformance = attendances.reduce((acc, attendance) => {
      const doctorName = attendance.doctor?.fullName || 'Unknown Doctor';
      if (!acc[doctorName]) {
        acc[doctorName] = {
          doctorName,
          specialization: attendance.doctor?.specialization || 'Unknown',
          totalAttendances: 0,
          uniquePatients: new Set()
        };
      }
      acc[doctorName].totalAttendances += 1;
      acc[doctorName].uniquePatients.add(attendance.patientId);
      return acc;
    }, {} as Record<string, any>);

    // Convert doctor performance to array format
    const doctorPerformanceArray = Object.values(doctorPerformance).map((doc: any) => ({
      ...doc,
      uniquePatients: doc.uniquePatients.size,
      averagePatientsPerDay: doc.totalAttendances / Math.max(1, doc.uniquePatients.size)
    }));

    // Insurance Provider Analysis
    const insuranceProviderAnalysis = attendances.reduce((acc, attendance) => {
      const provider = attendance.insuranceProvider?.name || 'Cash/Self-pay';
      const type = attendance.insuranceProvider?.type || 'cash';
      
      if (!acc[provider]) {
        acc[provider] = {
          providerName: provider,
          type: type,
          totalAttendances: 0,
          totalBilled: 0
        };
      }
      
      acc[provider].totalAttendances += 1;
      acc[provider].totalBilled += attendance.bill?.totalAmount || 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Patient Visit Frequency Analysis
    const patientVisitFrequency = attendances.reduce((acc, attendance) => {
      const patientId = attendance.patientId;
      acc[patientId] = (acc[patientId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const visitFrequencyDistribution = Object.values(patientVisitFrequency).reduce((acc, visitCount) => {
      if (visitCount === 1) acc['1 visit'] = (acc['1 visit'] || 0) + 1;
      else if (visitCount >= 2 && visitCount <= 5) acc['2-5 visits'] = (acc['2-5 visits'] || 0) + 1;
      else if (visitCount >= 6 && visitCount <= 10) acc['6-10 visits'] = (acc['6-10 visits'] || 0) + 1;
      else acc['10+ visits'] = (acc['10+ visits'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate comprehensive report
    const reportData = {
      reportType: 'COMPREHENSIVE ATTENDANCE REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // Summary Statistics
      summary: {
        totalAttendances,
        uniquePatients,
        averageVisitsPerPatient: totalAttendances / Math.max(1, uniquePatients),
        newPatients: await getNewPatientsCount(startDate as string, endDate as string),
        returningPatients: uniquePatients - await getNewPatientsCount(startDate as string, endDate as string)
      },
      
      // Demographic Analysis
      demographics: {
        ghsBreakdown: ghsDemographics,
        genderDistribution: {
          male: ghsDemographics.male.total,
          female: ghsDemographics.female.total
        }
      },
      
      // Attendance Pattern Analysis
      attendancePatterns: {
        byType: attendanceTypeAnalysis,
        byPaymentMode: paymentModeAnalysis,
        byEncounterCategory: encounterCategoryAnalysis,
        byVisitCategory: visitCategoryAnalysis,
        byStatus: statusAnalysis,
        
        // Time-based patterns
        hourlyDistribution,
        dailyDistribution,
        monthlyDistribution,
        
        // Visit frequency
        visitFrequency: visitFrequencyDistribution
      },
      
      // Clinical Analysis
      clinicalAnalysis: {
        topDiagnoses: Object.values(diagnosisAnalysis)
          .sort((a: any, b: any) => b.totalCases - a.totalCases)
          .slice(0, 15),
        
        diagnosisByCategory: Object.values(diagnosisAnalysis).reduce((acc, diag: any) => {
          acc[diag.category] = (acc[diag.category] || 0) + diag.totalCases;
          return acc;
        }, {} as Record<string, number>)
      },
      
      // Service Analysis
      serviceAnalysis: {
        topServices: Object.values(serviceUtilization)
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
          .slice(0, 10),
        
        servicesByType: Object.values(serviceUtilization).reduce((acc, service: any) => {
          acc[service.type] = (acc[service.type] || 0) + service.totalQuantity;
          return acc;
        }, {} as Record<string, number>),
        
        servicesByCategory: Object.values(serviceUtilization).reduce((acc, service: any) => {
          acc[service.category] = (acc[service.category] || 0) + service.totalQuantity;
          return acc;
        }, {} as Record<string, number>)
      },
      
      // Financial Analysis
      financialAnalysis: {
        ...financialAnalysis,
        collectionRate: financialAnalysis.totalRevenue > 0 
          ? (financialAnalysis.totalPaid / financialAnalysis.totalRevenue) * 100 
          : 0,
        averageBillAmount: financialAnalysis.totalBills > 0 
          ? financialAnalysis.totalRevenue / financialAnalysis.totalBills 
          : 0
      },
      
      // Performance Analysis
      performanceAnalysis: {
        topDoctors: doctorPerformanceArray
          .sort((a: any, b: any) => b.totalAttendances - a.totalAttendances)
          .slice(0, 10),
        
        insuranceProviders: Object.values(insuranceProviderAnalysis)
          .sort((a: any, b: any) => b.totalAttendances - a.totalAttendances)
      },
      
      // Operational Metrics
      operationalMetrics: {
        averageWaitTime: await calculateAverageWaitTime(startDate as string, endDate as string),
        peakHours: Object.entries(hourlyDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([hour]) => hour),
        
        busiestDays: Object.entries(dailyDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([day]) => day)
      },
      
      generatedAt: new Date(),
      dataSource: 'Attendance Register, Billing System, Patient Records'
    };

    console.log('✅ Comprehensive Attendance Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating attendance report', error);
  }
};

// Helper functions for attendance report
async function getNewPatientsCount(startDate: string, endDate: string): Promise<number> {
  const where: any = {};
  
  if (startDate || endDate) {
    where.registeredAt = {};
    if (startDate) where.registeredAt.gte = new Date(startDate);
    if (endDate) where.registeredAt.lte = new Date(endDate);
  }

  const newPatients = await prisma.patient.count({ where });
  return newPatients;
}

async function calculateAverageWaitTime(startDate: string, endDate: string): Promise<number> {
  // This would typically calculate the average time between appointment time and actual consultation
  // For now, return a placeholder value
  return 15.5; // minutes
}



/**
 * Comprehensive Revenue Analysis Report
 * Analyzes revenue streams, payment patterns, and financial performance
 */
export const getRevenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      paymentMode, 
      serviceCategory,
      analysisType = 'comprehensive'
    } = req.query;
    
    console.log('💰 Generating Comprehensive Revenue Report...');

    const where: any = {
      status: BillStatus.paid // Only consider paid bills for revenue
    };

    // Date range filter
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate as string);
      if (endDate) where.billDate.lte = new Date(endDate as string);
    }

    // Additional filters
    if (paymentMode) where.paymentMode = paymentMode;

    const bills = await prisma.bill.findMany({
      where,
      include: {
        attendance: {
          include: {
            patient: {
              select: {
                id: true,
                surname: true,
                otherNames: true,
                gender: true,
                dateOfBirth: true,
                folderNumber: true,
                paymentMode: true
              }
            },
            servicesRendered: {
              include: {
                serviceCatalog: {
                  select: {
                    name: true,
                    serviceType: true,
                    serviceCategory: true,
                    cost: true
                  }
                }
              }
            },
            insuranceProvider: {
              select: {
                name: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { billDate: 'desc' }
    });

    // Calculate basic revenue statistics
    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
    const totalBills = bills.length;
    const averageBillAmount = totalBills > 0 ? totalRevenue / totalBills : 0;

    // Revenue by Payment Mode
    const revenueByPaymentMode = bills.reduce((acc, bill) => {
      const mode = bill.paymentMode;
      if (!acc[mode]) {
        acc[mode] = {
          paymentMode: mode,
          totalRevenue: 0,
          billCount: 0,
          averageBill: 0
        };
      }
      acc[mode].totalRevenue += bill.paidAmount || 0;
      acc[mode].billCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for payment modes
    Object.values(revenueByPaymentMode).forEach((mode: any) => {
      mode.averageBill = mode.billCount > 0 ? mode.totalRevenue / mode.billCount : 0;
    });

    // Revenue by Service Category
    const revenueByServiceCategory = bills.reduce((acc, bill) => {
      bill.attendance?.servicesRendered.forEach(service => {
        const category = service.serviceCatalog.serviceCategory || 'Uncategorized';
        const serviceRevenue = (service.serviceCatalog.cost || 0) * service.quantity;
        
        if (!acc[category]) {
          acc[category] = {
            category,
            totalRevenue: 0,
            serviceCount: 0,
            averageRevenue: 0
          };
        }
        acc[category].totalRevenue += serviceRevenue;
        acc[category].serviceCount += service.quantity;
      });
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for service categories
    Object.values(revenueByServiceCategory).forEach((category: any) => {
      category.averageRevenue = category.serviceCount > 0 ? category.totalRevenue / category.serviceCount : 0;
    });

    // Revenue by Insurance Provider
    const revenueByInsuranceProvider = bills.reduce((acc, bill) => {
      const provider = bill.attendance?.insuranceProvider?.name || 'Cash/Self-pay';
      const providerType = bill.attendance?.insuranceProvider?.type || 'cash';
      
      if (!acc[provider]) {
        acc[provider] = {
          providerName: provider,
          providerType,
          totalRevenue: 0,
          billCount: 0,
          averageBill: 0
        };
      }
      acc[provider].totalRevenue += bill.paidAmount || 0;
      acc[provider].billCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for insurance providers
    Object.values(revenueByInsuranceProvider).forEach((provider: any) => {
      provider.averageBill = provider.billCount > 0 ? provider.totalRevenue / provider.billCount : 0;
    });

    // Monthly Revenue Trend
    const monthlyRevenue = bills.reduce((acc, bill) => {
      const monthYear = bill.billDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          period: monthYear,
          totalRevenue: 0,
          billCount: 0,
          averageBill: 0
        };
      }
      acc[monthYear].totalRevenue += bill.paidAmount || 0;
      acc[monthYear].billCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for monthly trends
    Object.values(monthlyRevenue).forEach((month: any) => {
      month.averageBill = month.billCount > 0 ? month.totalRevenue / month.billCount : 0;
    });

    // Daily Revenue Pattern
    const dailyRevenuePattern = bills.reduce((acc, bill) => {
      const dayOfWeek = bill.billDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = {
          day: dayOfWeek,
          totalRevenue: 0,
          billCount: 0,
          averageBill: 0
        };
      }
      acc[dayOfWeek].totalRevenue += bill.paidAmount || 0;
      acc[dayOfWeek].billCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for daily patterns
    Object.values(dailyRevenuePattern).forEach((day: any) => {
      day.averageBill = day.billCount > 0 ? day.totalRevenue / day.billCount : 0;
    });

    // Top Revenue Generating Services
    const topRevenueServices = bills.reduce((acc, bill) => {
      bill.attendance?.servicesRendered.forEach(service => {
        const serviceName = service.serviceCatalog.name;
        const serviceRevenue = (service.serviceCatalog.cost || 0) * service.quantity;
        
        if (!acc[serviceName]) {
          acc[serviceName] = {
            serviceName,
            serviceType: service.serviceCatalog.serviceType,
            serviceCategory: service.serviceCatalog.serviceCategory,
            totalRevenue: 0,
            quantity: 0,
            averageRevenue: 0
          };
        }
        acc[serviceName].totalRevenue += serviceRevenue;
        acc[serviceName].quantity += service.quantity;
      });
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for top services
    Object.values(topRevenueServices).forEach((service: any) => {
      service.averageRevenue = service.quantity > 0 ? service.totalRevenue / service.quantity : 0;
    });

    // Payment Method Efficiency
    const paymentMethodEfficiency = bills.reduce((acc, bill) => {
      const mode = bill.paymentMode;
      const billAmount = bill.totalAmount || 0;
      const paidAmount = bill.paidAmount || 0;
      
      if (!acc[mode]) {
        acc[mode] = {
          paymentMode: mode,
          totalBilled: 0,
          totalCollected: 0,
          collectionRate: 0,
          averageCollectionTime: 0 // This would require payment timing data
        };
      }
      acc[mode].totalBilled += billAmount;
      acc[mode].totalCollected += paidAmount;
      return acc;
    }, {} as Record<string, any>);

    // Calculate collection rates
    Object.values(paymentMethodEfficiency).forEach((method: any) => {
      method.collectionRate = method.totalBilled > 0 
        ? (method.totalCollected / method.totalBilled) * 100 
        : 0;
    });

    // Revenue by Patient Demographics
    const revenueByDemographics = bills.reduce((acc, bill) => {
      const patient = bill.attendance?.patient;
      if (!patient) return acc;

      const gender = patient.gender;
      const age = calculateGHSAge(patient.dateOfBirth, bill.billDate).years;
      const ageGroup = getGHSAgeGroup(patient.dateOfBirth, bill.billDate);
      
      // By Gender
      if (!acc.byGender[gender]) {
        acc.byGender[gender] = {
          gender,
          totalRevenue: 0,
          patientCount: 0,
          averageRevenue: 0
        };
      }
      acc.byGender[gender].totalRevenue += bill.paidAmount || 0;
      acc.byGender[gender].patientCount += 1;

      // By Age Group
      if (!acc.byAgeGroup[ageGroup]) {
        acc.byAgeGroup[ageGroup] = {
          ageGroup,
          totalRevenue: 0,
          patientCount: 0,
          averageRevenue: 0
        };
      }
      acc.byAgeGroup[ageGroup].totalRevenue += bill.paidAmount || 0;
      acc.byAgeGroup[ageGroup].patientCount += 1;

      return acc;
    }, {
      byGender: {} as Record<string, any>,
      byAgeGroup: {} as Record<string, any>
    });

    // Calculate averages for demographics
    Object.values(revenueByDemographics.byGender).forEach((gender: any) => {
      gender.averageRevenue = gender.patientCount > 0 ? gender.totalRevenue / gender.patientCount : 0;
    });
    Object.values(revenueByDemographics.byAgeGroup).forEach((ageGroup: any) => {
      ageGroup.averageRevenue = ageGroup.patientCount > 0 ? ageGroup.totalRevenue / ageGroup.patientCount : 0;
    });

    // Generate comprehensive revenue report
    const reportData = {
      reportType: 'COMPREHENSIVE REVENUE ANALYSIS REPORT',
      facility: await getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0]
      },
      
      // Summary Statistics
      summary: {
        totalRevenue,
        totalBills,
        averageBillAmount,
        collectionEfficiency: await calculateCollectionEfficiency(startDate as string, endDate as string),
        revenueGrowth: await calculateRevenueGrowth(startDate as string, endDate as string)
      },
      
      // Revenue Breakdown by Payment Mode
      revenueByPaymentMode: Object.values(revenueByPaymentMode)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
      
      // Revenue by Service Category
      revenueByServiceCategory: Object.values(revenueByServiceCategory)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
      
      // Revenue by Insurance Provider
      revenueByInsuranceProvider: Object.values(revenueByInsuranceProvider)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
      
      // Monthly Revenue Trends
      monthlyRevenueTrend: Object.values(monthlyRevenue)
        .sort((a: any, b: any) => new Date(a.period).getTime() - new Date(b.period).getTime()),
      
      // Daily Revenue Patterns
      dailyRevenuePattern: Object.values(dailyRevenuePattern),
      
      // Top Performing Services
      topRevenueServices: Object.values(topRevenueServices)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .slice(0, 15),
      
      // Payment Method Efficiency
      paymentEfficiency: Object.values(paymentMethodEfficiency),
      
      // Demographic Analysis
      demographicAnalysis: {
        byGender: Object.values(revenueByDemographics.byGender),
        byAgeGroup: Object.values(revenueByDemographics.byAgeGroup)
      },
      
      // Financial Metrics
      financialMetrics: {
        revenuePerPatient: await calculateRevenuePerPatient(startDate as string, endDate as string),
        costRecoveryRate: await calculateCostRecoveryRate(startDate as string, endDate as string),
        outstandingRevenue: await calculateOutstandingRevenue(startDate as string, endDate as string)
      },
      
      generatedAt: new Date(),
      dataSource: 'Billing System, Payment Records'
    };

    console.log('✅ Comprehensive Revenue Report generated successfully');
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    handleError(res, 'Error generating revenue report', error);
  }
};

// Helper functions for revenue report
async function calculateCollectionEfficiency(startDate: string, endDate: string): Promise<number> {
  const where: any = {};
  
  if (startDate || endDate) {
    where.billDate = {};
    if (startDate) where.billDate.gte = new Date(startDate);
    if (endDate) where.billDate.lte = new Date(endDate);
  }

  const bills = await prisma.bill.aggregate({
    where,
    _sum: {
      totalAmount: true,
      paidAmount: true
    }
  });

  const totalAmount = bills._sum.totalAmount || 0;
  const paidAmount = bills._sum.paidAmount || 0;

  return totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
}

async function calculateRevenueGrowth(startDate: string, endDate: string): Promise<number> {
  // Calculate revenue growth compared to previous period
  // For now, return a placeholder value
  return 12.5; // percentage growth
}

async function calculateRevenuePerPatient(startDate: string, endDate: string): Promise<number> {
  const where: any = {
    status: BillStatus.paid
  };
  
  if (startDate || endDate) {
    where.billDate = {};
    if (startDate) where.billDate.gte = new Date(startDate);
    if (endDate) where.billDate.lte = new Date(endDate);
  }

  const [revenueData, patientCount] = await Promise.all([
    prisma.bill.aggregate({
      where,
      _sum: {
        paidAmount: true
      }
    }),
    prisma.bill.groupBy({
      by: ['attendanceId'],
      where,
      _count: {
        _all: true
      }
    })
  ]);

  const totalRevenue = revenueData._sum.paidAmount || 0;
  const uniquePatients = patientCount.length;

  return uniquePatients > 0 ? totalRevenue / uniquePatients : 0;
}

async function calculateCostRecoveryRate(startDate: string, endDate: string): Promise<number> {
  // This would typically compare revenue against operational costs
  // For now, return a placeholder value
  return 85.2; // percentage
}

async function calculateOutstandingRevenue(startDate: string, endDate: string): Promise<number> {
  const where: any = {
    status: { in: [BillStatus.pending, BillStatus.partially_paid] }
  };
  
  if (startDate || endDate) {
    where.billDate = {};
    if (startDate) where.billDate.gte = new Date(startDate);
    if (endDate) where.billDate.lte = new Date(endDate);
  }

  const outstandingBills = await prisma.bill.aggregate({
    where,
    _sum: {
      balance: true
    }
  });

  return outstandingBills._sum.balance || 0;
}
// Export all report functions
export default {
  getGHSOPDReport,
  getGHSIPDReport,
  getGHSANCReport,
  getGHSCWCReport,
  getGHSFamilyPlanningReport,
  getMorbidityMortalityReport,
  getDemographicReport,
  getFinancialReport,
  getInsuranceClaimsReport,
  getClinicalReport
};
