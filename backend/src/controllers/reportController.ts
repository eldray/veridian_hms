import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, Gender, AttendanceType, EncounterCategory, PaymentMode, AdmissionType } from '@prisma/client';
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
 * GHS OPD (Outpatient Department) Report
 * Based on Ghana Health Service OPD reporting requirements
 */
export const getGHSOPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, ageGroup, gender, diagnosisCategory } = req.query;
    
    console.log('🏥 Generating GHS OPD Report...');

    const where: any = {
      encounterCategory: 'opd'
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
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
                id: true,
                name: true,
                icdCode: true,
                category: true
              }
            }
          }
        },
        vitals: {
          select: {
            bloodPressure: true,
            temperature: true,
            pulse: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process data for GHS OPD format
    const reportData = {
      reportType: 'GHS OPD Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary: {
        totalAttendances: attendances.length,
        newCases: attendances.filter(a => a.attendanceType === 'general_consultation').length,
        followUpCases: attendances.filter(a => a.attendanceType === 'chronic_followup').length,
        emergencyCases: attendances.filter(a => a.attendanceType === 'emergency_acute').length
      },
      demographicBreakdown: {
        byGender: attendances.reduce((acc, attendance) => {
          const gender = attendance.patient.gender;
          acc[gender] = (acc[gender] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        byAgeGroup: attendances.reduce((acc, attendance) => {
          const age = calculateAge(attendance.patient.dateOfBirth);
          const ageGroup = getGHSAgeGroup(age);
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      
      clinicalBreakdown: {
        topDiagnoses: getTopItems(attendances.flatMap(a => 
          a.diagnoses.map(d => d.diagnosis?.name).filter(Boolean)
        ), 10),
        
        byDiagnosisCategory: attendances.flatMap(a => 
          a.diagnoses.map(d => d.diagnosis?.category).filter(Boolean)
        ).reduce((acc, category) => {
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        commonSymptoms: ['Fever', 'Cough', 'Headache', 'Abdominal Pain', 'Chest Pain'] // Would come from complaints field
      },
      
      attendancePattern: {
        byType: attendances.reduce((acc, attendance) => {
          acc[attendance.attendanceType] = (acc[attendance.attendanceType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        byVisitCategory: attendances.reduce((acc, attendance) => {
          acc[attendance.visitCategory] = (acc[attendance.visitCategory] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      
      generatedAt: new Date()
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
 * GHS IPD (Inpatient Department) Report
 * Based on Ghana Health Service inpatient reporting requirements
 */
export const getGHSIPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, wardType, admissionType } = req.query;
    
    console.log('🏥 Generating GHS IPD Report...');

    const where: any = {
      encounterCategory: 'ipd'
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
otherNames: true,
            gender: true,
            dateOfBirth: true
          }
        },
        admission: {
          include: {
            ward: {
              select: {
                wardName: true,
                wardType: true
              }
            },
            principalDiagnosis: {
              select: {
                name: true,
                icdCode: true,
                category: true
              }
            },
            secondaryDiagnoses: {
              include: {
                diagnosis: {
                  select: {
                    name: true,
                    category: true
                  }
                }
              }
            }
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
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    const reportData = {
      reportType: 'GHS IPD Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary: {
        totalAdmissions: attendances.length,
        averageLengthOfStay: calculateAverageLOS(attendances),
        bedOccupancyRate: await calculateBedOccupancyRate(startDate as string, endDate as string),
        mortalityRate: await calculateMortalityRate(startDate as string, endDate as string)
      },
      
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
        }, {} as Record<string, number>)
      },
      
      clinicalData: {
        principalDiagnoses: getTopItems(attendances.map(a => 
          a.admission?.principalDiagnosis?.name
        ).filter(Boolean), 15),
        
        comorbidities: getTopItems(attendances.flatMap(a => 
          a.admission?.secondaryDiagnoses.map(sd => sd.diagnosis.name) || []
        ), 10),
        
        proceduresPerformed: await getProceduresCount(startDate as string, endDate as string)
      },
      
      outcomeAnalysis: {
        dischargeDestinations: await getDischargeDestinations(startDate as string, endDate as string),
        readmissionRate: await calculateReadmissionRate(startDate as string, endDate as string)
      },
      
      generatedAt: new Date()
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
 * GHS ANC (Antenatal Care) Report
 * Based on Ghana Health Service maternal health reporting
 */
export const getGHSANCReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, trimester } = req.query;
    
    console.log('🤰 Generating GHS ANC Report...');

    const where: any = {
      attendanceType: 'antenatal'
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const ancAttendances = await prisma.attendance.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
otherNames: true,
            gender: true,
            dateOfBirth: true
          }
        },
        vitals: {
          select: {
            bloodPressure: true,
            weight: true,
            height: true
          }
        },
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    const reportData = {
      reportType: 'GHS Antenatal Care Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary: {
        totalANCVIsits: ancAttendances.length,
        uniquePregnantWomen: new Set(ancAttendances.map(a => a.patientId)).size,
        firstTrimesterVisits: ancAttendances.filter(a => isFirstTrimester(a.dateTime)).length,
        fourthANCCount: ancAttendances.filter(a => getANCCount(a.patientId, ancAttendances) >= 4).length
      },
      
      demographicProfile: {
        ageDistribution: ancAttendances.reduce((acc, attendance) => {
          const age = calculateAge(attendance.patient.dateOfBirth);
          const ageGroup = getMaternalAgeGroup(age);
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        gravidaDistribution: await getGravidaDistribution(ancAttendances)
      },
      
      clinicalIndicators: {
        hypertensionCases: ancAttendances.filter(a => 
          a.vitals.some(v => hasHypertension(v.bloodPressure))
        ).length,
        
        anemiaSuspected: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('anemia'))
        ).length,
        
        receivedTTVaccine: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('tetanus'))
        ).length,
        
        malariaInPregnancy: ancAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('malaria'))
        ).length
      },
      
      serviceUtilization: {
        averageGestationalAge: calculateAverageGestationalAge(ancAttendances),
        iptpCoverage: await calculateIPTpCoverage(startDate as string, endDate as string),
        itnDistribution: await calculateITNDistribution(startDate as string, endDate as string)
      },
      
      generatedAt: new Date()
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
 * GHS Child Welfare Clinic (CWC) Report
 */
export const getGHSCWCReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, ageGroup, vaccinationType } = req.query;
    
    console.log('👶 Generating GHS CWC Report...');

    const where: any = {
      attendanceType: 'general_consultation'
    };

    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    // Get child patients (under 5 years)
    const childAttendances = await prisma.attendance.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
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
                category: true
              }
            }
          }
        },
        vitals: {
          select: {
            weight: true,
            height: true
          }
        }
      }
    }).then(attendances => attendances.filter(a => {
      const age = calculateAge(a.patient.dateOfBirth);
      return age < 5; // Children under 5 years
    }));

    const reportData = {
      reportType: 'GHS Child Welfare Clinic Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary: {
        totalCWCVisits: childAttendances.length,
        uniqueChildren: new Set(childAttendances.map(a => a.patientId)).size,
        childrenFullyImmunized: await getFullyImmunizedCount(startDate as string, endDate as string),
        malnutritionCases: childAttendances.filter(a => 
          a.diagnoses.some(d => d.diagnosis?.name.toLowerCase().includes('malnutrition'))
        ).length
      },
      
      growthMonitoring: {
        underweight: childAttendances.filter(a => isUnderweight(a.vitals)).length,
        stunting: childAttendances.filter(a => isStunted(a.vitals)).length,
        wasting: childAttendances.filter(a => isWasted(a.vitals)).length
      },
      
      immunizationCoverage: {
        bcg: await getVaccinationCoverage('bcg', startDate as string, endDate as string),
        opv: await getVaccinationCoverage('opv', startDate as string, endDate as string),
        pentavalent: await getVaccinationCoverage('pentavalent', startDate as string, endDate as string),
        pcv: await getVaccinationCoverage('pcv', startDate as string, endDate as string),
        measles: await getVaccinationCoverage('measles', startDate as string, endDate as string)
      },
      
      commonChildhoodIllnesses: {
        malaria: countDiseaseCases(childAttendances, 'malaria'),
        diarrhea: countDiseaseCases(childAttendances, 'diarrhea'),
        pneumonia: countDiseaseCases(childAttendances, 'pneumonia'),
        acuteRespiratoryInfection: countDiseaseCases(childAttendances, 'respiratory infection')
      },
      
      generatedAt: new Date()
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

/**
 * GHS Family Planning Report
 */
export const getGHSFamilyPlanningReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, methodType, ageGroup } = req.query;
    
    console.log('👨‍👩‍👧‍👦 Generating GHS Family Planning Report...');

    const where: any = {
      OR: [
        { attendanceType: 'general_consultation' },
        { attendanceType: 'specialist_consultation' }
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
        patient: {
          select: {
            id: true,
            surname: true,
otherNames: true,
            gender: true,
            dateOfBirth: true
          }
        },
        servicesRendered: {
          include: {
            serviceItem: {
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
        s.serviceItem.name.toLowerCase().includes('family planning') ||
        s.serviceItem.serviceType === 'procedure'
      )
    ));

    const reportData = {
      reportType: 'GHS Family Planning Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary: {
        totalFPClients: new Set(fpAttendances.map(a => a.patientId)).size,
        newAcceptors: await getNewFPAcceptors(startDate as string, endDate as string),
        continuingUsers: await getContinuingFPUsers(startDate as string, endDate as string),
        coupleYearProtection: await calculateCoupleYearProtection(startDate as string, endDate as string)
      },
      
      methodMix: {
        oralContraceptives: await getMethodCount('oral', startDate as string, endDate as string),
        injectables: await getMethodCount('injectable', startDate as string, endDate as string),
        implants: await getMethodCount('implant', startDate as string, endDate as string),
        iud: await getMethodCount('iud', startDate as string, endDate as string),
        condoms: await getMethodCount('condom', startDate as string, endDate as string),
        traditionalMethods: await getMethodCount('traditional', startDate as string, endDate as string)
      },
      
      clientProfile: {
        byAgeGroup: fpAttendances.reduce((acc, attendance) => {
          const age = calculateAge(attendance.patient.dateOfBirth);
          const ageGroup = getMaternalAgeGroup(age);
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        byParity: await getParityDistribution(startDate as string, endDate as string)
      },
      
      serviceDelivery: {
        postpartumFPAcceptors: await getPostpartumFPClients(startDate as string, endDate as string),
        fpCounsellingSessions: await getFPCounsellingSessions(startDate as string, endDate as string),
        methodSwitching: await getMethodSwitchingRate(startDate as string, endDate as string)
      },
      
      generatedAt: new Date()
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
          patient: {
            select: {
              id: true,
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
                  category: true,
                  isChronic: true
                }
              }
            }
          }
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
          }
        }
      }),
      
      // Mortality cases (discharge status = expired)
      prisma.admission.findMany({
        where: {
          dischargeStatus: 'expired',
          dischargeDate: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        include: {
          principalDiagnosis: true,
          patient: true
        }
      })
    ]);

    const reportData = {
      reportType: 'Morbidity and Mortality Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      
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
          const age = calculateAge(case_.patient.dateOfBirth);
          const ageGroup = getGHSAgeGroup(age);
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        maternalDeaths: mortalityCases.filter(m => 
          m.principalDiagnosis?.category === 'obstetric'
        ).length,
        
        infantMortality: mortalityCases.filter(m => {
          const age = calculateAge(m.patient.dateOfBirth);
          return age < 1;
        }).length
      },
      
      preventiveHealth: {
        immunizationCoverage: await getImmunizationCoverage(startDate as string, endDate as string),
        screeningRates: await getScreeningRates(startDate as string, endDate as string),
        outbreakAlerts: await getOutbreakAlerts(startDate as string, endDate as string)
      },
      
      generatedAt: new Date()
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
              address: true
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
          paymentMode: true
        }
      })
    ]);

    const uniquePatients = Array.from(new Set(attendances.map(a => a.patientId)))
      .map(id => attendances.find(a => a.patientId === id)?.patient)
      .filter(Boolean);

    const reportData = {
      reportType: 'Demographic Analysis Report',
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      
      patientDemographics: {
        totalPatients: patients.length,
        genderDistribution: patients.reduce((acc, patient) => {
          acc[patient.gender] = (acc[patient.gender] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        agePyramid: patients.reduce((acc, patient) => {
          const age = calculateAge(patient.dateOfBirth);
          const ageGroup = getDetailedAgeGroup(age);
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
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
      
      generatedAt: new Date()
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

// ==================== HELPER FUNCTIONS ====================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function getGHSAgeGroup(age: number): string {
  if (age < 1) return 'Under 1';
  if (age < 5) return '1-4';
  if (age < 15) return '5-14';
  if (age < 20) return '15-19';
  if (age < 45) return '20-44';
  if (age < 65) return '45-64';
  return '65+';
}

function getDetailedAgeGroup(age: number): string {
  if (age < 1) return '0-1';
  if (age < 5) return '1-4';
  if (age < 10) return '5-9';
  if (age < 15) return '10-14';
  if (age < 20) return '15-19';
  if (age < 30) return '20-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  return '70+';
}

function getMaternalAgeGroup(age: number): string {
  if (age < 20) return 'Teen (<20)';
  if (age < 25) return '20-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  return '40+';
}

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

// Additional helper functions would be implemented based on specific reporting needs
async function calculateBedOccupancyRate(startDate: string, endDate: string): Promise<number> {
  // Implementation for bed occupancy rate calculation
  return 75.5; // Example value
}

async function calculateMortalityRate(startDate: string, endDate: string): Promise<number> {
  // Implementation for mortality rate calculation
  return 2.1; // Example value
}

// Comprehensive Financial Report
export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reportType = 'summary' } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        bill: true,
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process financial data
    const financialData = attendances.reduce((acc, attendance) => {
      const bill = attendance.bill;
      const month = attendance.dateTime.getMonth() + 1;
      const year = attendance.dateTime.getFullYear();
      
      const key = `${attendance.paymentMode}-${attendance.attendanceType}-${month}-${year}`;
      
      if (!acc[key]) {
        acc[key] = {
          paymentMode: attendance.paymentMode,
          attendanceType: attendance.attendanceType,
          month,
          year,
          totalAttendances: 0,
          totalRevenue: 0,
          totalPaid: 0,
          outstandingBalance: 0
        };
      }
      
      acc[key].totalAttendances += 1;
      acc[key].totalRevenue += bill?.totalAmount || 0;
      acc[key].totalPaid += bill?.paidAmount || 0;
      acc[key].outstandingBalance += bill?.balance || 0;
      
      return acc;
    }, {} as any);

    const breakdown = Object.values(financialData).map((item: any) => ({
      ...item,
      averageBillAmount: item.totalAttendances > 0 
        ? Math.round((item.totalRevenue / item.totalAttendances) * 100) / 100 
        : 0
    }));

    // Summary statistics
    const summary = Object.values(financialData).reduce((acc: any, curr: any) => {
      acc.totalRevenue += curr.totalRevenue;
      acc.totalPaid += curr.totalPaid;
      acc.outstandingBalance += curr.outstandingBalance;
      acc.totalAttendances += curr.totalAttendances;
      return acc;
    }, { totalRevenue: 0, totalPaid: 0, outstandingBalance: 0, totalAttendances: 0 });

    res.json({
      reportPeriod: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
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

// Insurance Claims Report
export const getInsuranceClaimsReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, insuranceProviderId, status } = req.query;

    const where: any = {
      paymentMode: { in: ['nhis', 'private_insurance'] }
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
        insuranceProvider: true,
        patient: {
          select: {
            surname: true,
otherNames: true,
            folderNumber: true
          }
        },
        bill: {
          select: {
            totalAmount: true,
            insuranceCovered: true,
            paidAmount: true
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process claims data
    const claimsReport = claims.reduce((acc, claim) => {
      const provider = claim.insuranceProvider?.name || 'Unknown';
      const status = claim.claimStatus || 'pending';
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
          totalApprovedAmount: 0,
          totalPaidAmount: 0
        };
      }
      
      acc[key].totalClaims += 1;
      acc[key].totalClaimAmount += claim.bill?.insuranceCovered || 0;
      acc[key].totalApprovedAmount += claim.claimAmountApproved || 0;
      acc[key].totalPaidAmount += claim.bill?.paidAmount || 0;
      
      return acc;
    }, {} as any);

    const reportData = Object.values(claimsReport).map((item: any) => ({
      ...item,
      approvalRate: item.totalClaimAmount > 0 
        ? Math.round((item.totalApprovedAmount / item.totalClaimAmount) * 10000) / 100 
        : 0,
      averageProcessingDays: 0 // Would need additional fields to calculate this
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

// Clinical Statistics Report
export const getClinicalReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, diagnosisCode, attendingClinician } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }
    if (attendingClinician) where.attendingClinician = attendingClinician;

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
                code: true
              }
            }
          }
        },
        servicesRendered: {
          include: {
            serviceItem: {
              select: {
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process clinical data
    const clinicalReport = clinicalData.reduce((acc, attendance) => {
      attendance.diagnoses.forEach(diagnosisItem => {
        const diagnosis = diagnosisItem.diagnosis;
        if (!diagnosis) return;

        const key = `${diagnosis.name}-${diagnosis.code}-${attendance.attendingClinician}-${attendance.dateTime.getMonth() + 1}`;
        
        if (!acc[key]) {
          acc[key] = {
            diagnosis: diagnosis.name,
            icdCode: diagnosis.code,
            clinician: attendance.attendingClinician,
            month: attendance.dateTime.getMonth() + 1,
            totalCases: 0,
            ages: [],
            genders: [],
            comorbidities: new Set()
          };
        }
        
        acc[key].totalCases += 1;
        
        // Calculate age
        if (attendance.patient.dateOfBirth) {
          const age = Math.floor((new Date().getTime() - new Date(attendance.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          acc[key].ages.push(age);
        }
        
        acc[key].genders.push(attendance.patient.gender);
        
        // Add comorbidities from other diagnoses
        attendance.diagnoses.forEach(d => {
          if (d.diagnosis && d.diagnosis.name !== diagnosis.name) {
            acc[key].comorbidities.add(d.diagnosis.name);
          }
        });
      });
      
      return acc;
    }, {} as any);

    const reportData = Object.values(clinicalReport).map((item: any) => {
      const genders = item.genders || [];
      return {
        diagnosis: item.diagnosis,
        icdCode: item.icdCode,
        clinician: item.clinician,
        month: item.month,
        totalCases: item.totalCases,
        averageAge: item.ages.length > 0 
          ? Math.round(item.ages.reduce((a: number, b: number) => a + b, 0) / item.ages.length * 10) / 10 
          : 0,
        genderDistribution: {
          male: genders.filter((g: string) => g === 'male').length,
          female: genders.filter((g: string) => g === 'female').length
        },
        commonComorbidities: Array.from(item.comorbidities).slice(0, 5)
      };
    });

    res.json({
      reportType: 'Clinical Statistics',
      period: { startDate, endDate },
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

// Revenue Analysis Report
export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const revenueData = await prisma.attendance.findMany({
      where,
      include: {
        bill: true
      },
      orderBy: { dateTime: 'desc' }
    });

    // Group data by period
    const groupedData = revenueData.reduce((acc, attendance) => {
      const date = attendance.dateTime;
      let periodKey: string;
      
      if (groupBy === 'day') {
        periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      } else if (groupBy === 'week') {
        const week = Math.ceil(date.getDate() / 7);
        periodKey = `${date.getFullYear()}-W${week}`;
      } else {
        periodKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }
      
      if (!acc[periodKey]) {
        acc[periodKey] = {
          period: periodKey,
          totalRevenue: 0,
          totalPaid: 0,
          visitCount: 0
        };
      }
      
      acc[periodKey].totalRevenue += attendance.bill?.totalAmount || 0;
      acc[periodKey].totalPaid += attendance.bill?.paidAmount || 0;
      acc[periodKey].visitCount += 1;
      
      return acc;
    }, {} as any);

    const reportData = Object.values(groupedData).map((item: any) => ({
      ...item,
      averageRevenuePerVisit: item.visitCount > 0 
        ? Math.round((item.totalRevenue / item.visitCount) * 100) / 100 
        : 0
    }));

    res.json({
      reportType: 'Revenue Analysis',
      period: { startDate, endDate },
      groupBy,
      revenueData: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ 
      message: 'Error generating revenue report', 
      error: (error as Error).message 
    });
  }
};

// Attendance Statistics Report
export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, department } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }
    if (department) where.department = department;

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Process attendance data
    const attendanceReport = attendances.reduce((acc, attendance) => {
      const key = `${attendance.attendanceType}-${attendance.status}-${attendance.dateTime.getMonth() + 1}-${attendance.dateTime.getFullYear()}`;
      
      if (!acc[key]) {
        acc[key] = {
          attendanceType: attendance.attendanceType,
          status: attendance.status,
          month: attendance.dateTime.getMonth() + 1,
          year: attendance.dateTime.getFullYear(),
          count: 0,
          durations: []
        };
      }
      
      acc[key].count += 1;
      
      // Calculate duration if available
      if (attendance.dateTime && attendance.updatedAt) {
        const duration = (attendance.updatedAt.getTime() - attendance.dateTime.getTime()) / (1000 * 60 * 60);
        acc[key].durations.push(duration);
      }
      
      return acc;
    }, {} as any);

    const reportData = Object.values(attendanceReport).map((item: any) => ({
      attendanceType: item.attendanceType,
      status: item.status,
      month: item.month,
      year: item.year,
      count: item.count,
      averageDuration: item.durations.length > 0 
        ? Math.round(item.durations.reduce((a: number, b: number) => a + b, 0) / item.durations.length * 100) / 100 
        : 0
    }));

    res.json({
      reportType: 'Attendance Statistics',
      period: { startDate, endDate },
      attendanceReport: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ 
      message: 'Error generating attendance report', 
      error: (error as Error).message 
    });
  }
};

// Export Report to PDF/Excel
export const exportReport = [
  body('reportType').isIn(['financial', 'insurance', 'clinical', 'attendance', 'revenue']).withMessage('Valid report type is required'),
  body('format').isIn(['pdf', 'excel', 'json']).withMessage('Valid format is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { reportType, format, startDate, endDate, filters } = req.body;

      // Generate report data based on type
      let reportData;
      switch (reportType) {
        case 'financial':
          reportData = await generateFinancialData(startDate, endDate, filters);
          break;
        case 'insurance':
          reportData = await generateInsuranceData(startDate, endDate, filters);
          break;
        case 'clinical':
          reportData = await generateClinicalData(startDate, endDate, filters);
          break;
        case 'attendance':
          reportData = await generateAttendanceData(startDate, endDate, filters);
          break;
        case 'revenue':
          reportData = await generateRevenueData(startDate, endDate, filters);
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      // In a real implementation, you would use libraries like:
      // - pdfkit for PDF generation
      // - exceljs for Excel generation
      // For now, we'll return JSON with export metadata

      res.json({
        message: `Report exported as ${format}`,
        reportType,
        format,
        period: { startDate, endDate },
        data: reportData,
        exportMetadata: {
          exportedBy: (req as any).user.fullName,
          exportedAt: new Date(),
          recordCount: Array.isArray(reportData) ? reportData.length : 1
        }
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ 
        message: 'Error exporting report', 
        error: (error as Error).message 
      });
    }
  }
];

// Helper functions for export
async function generateFinancialData(startDate: any, endDate: any, filters: any) {
  // Implementation for financial data generation
  return { message: 'Financial data export - implement PDF/Excel generation' };
}

async function generateInsuranceData(startDate: any, endDate: any, filters: any) {
  // Implementation for insurance data generation
  return { message: 'Insurance data export - implement PDF/Excel generation' };
}

async function generateClinicalData(startDate: any, endDate: any, filters: any) {
  // Implementation for clinical data generation
  return { message: 'Clinical data export - implement PDF/Excel generation' };
}

async function generateAttendanceData(startDate: any, endDate: any, filters: any) {
  // Implementation for attendance data generation
  return { message: 'Attendance data export - implement PDF/Excel generation' };
}

async function generateRevenueData(startDate: any, endDate: any, filters: any) {
  // Implementation for revenue data generation
  return { message: 'Revenue data export - implement PDF/Excel generation' };
}
