// controllers/insuranceClaimController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import InsuranceClaimModel from '../models/InsuranceClaim';
import BillModel from '../models/Bill';
import AttendanceModel from '../models/Attendance';
import PatientModel from '../models/Patient';
import InsuranceProviderModel from '../models/InsuranceProvider';
import { body, validationResult } from 'express-validator';

// Generate NHIS Claim Form (G-DRG Format)
export const generateNHISClaimForm = [
  async (req: Request, res: Response) => {
    try {
      const { attendanceId } = req.params;
      
      const attendance = await AttendanceModel.findById(attendanceId)
        .populate('patientId')
        .populate('attendingClinician')
        .populate('diagnoses.diagnosisId')
        .populate('procedures.templateId')
        .populate('medications.stockItemId')
        .populate('labTests.templateId')
        .populate('billId');

      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const patient: any = attendance.patientId;
      
      // NHIS G-DRG Claim Form Structure
      const nhisClaimForm = {
        // Header Information
        formType: 'G-DRG',
        claimNumber: `NHIS-${attendance.attendanceNumber}-${Date.now()}`,
        submissionDate: new Date(),
        
        // Patient Information
        patientInfo: {
          nhisNumber: attendance.nhisCCC,
          surname: patient?.lastName || '',
          otherNames: patient?.firstName || '',
          dateOfBirth: patient?.dateOfBirth,
          gender: patient?.gender,
          phone: patient?.contact?.phone,
          address: patient?.contact?.address
        },
        
        // Provider Information
        providerInfo: {
          facilityName: process.env.FACILITY_NAME || 'Healthcare Facility',
          facilityCode: process.env.FACILITY_CODE || 'FAC001',
          providerName: (attendance.attendingClinician as any)?.fullName,
          providerCode: (attendance.attendingClinician as any)?.licenseNumber
        },
        
        // Clinical Information
        clinicalInfo: {
          attendanceDate: attendance.dateTime,
          dischargeDate: attendance.status === 'discharged' ? new Date() : null,
          primaryDiagnosis: attendance.diagnoses.find(d => d.primary)?.diagnosisId?.name || '',
          secondaryDiagnoses: attendance.diagnoses.filter(d => !d.primary).map(d => ({
            diagnosis: d.diagnosisId?.name,
            icdCode: d.diagnosisId?.icdCode
          })),
          procedures: attendance.procedures.map(p => ({
            procedure: p.templateId?.name,
            code: p.templateId?.code,
            date: p.performedAt || p.scheduledDate
          }))
        },
        
        // Financial Information
        financialInfo: {
          totalBill: attendance.totalBill,
          nhisCoverage: attendance.totalBill * 0.8, // Assuming 80% coverage
          patientShare: attendance.totalBill * 0.2, // Assuming 20% co-payment
          items: await generateClaimItems(attendance)
        },
        
        // Authorization Information
        authorization: {
          preAuthNumber: attendance.nhisPreAuth,
          authorizingOfficer: (req as any).user.fullName,
          authorizationDate: new Date()
        }
      };

      res.json({
        message: 'NHIS Claim Form generated successfully',
        claimForm: nhisClaimForm,
        metadata: {
          attendanceNumber: attendance.attendanceNumber,
          patientName: `${patient?.firstName} ${patient?.lastName}`,
          totalAmount: attendance.totalBill
        }
      });
    } catch (error) {
      console.error('Error generating NHIS claim form:', error);
      res.status(500).json({ message: 'Error generating NHIS claim form', error });
    }
  }
];

// Generate Private Insurance Claim Form
export const generatePrivateInsuranceClaim = [
  async (req: Request, res: Response) => {
    try {
      const { attendanceId, insuranceProviderId } = req.params;
      
      const [attendance, insuranceProvider] = await Promise.all([
        AttendanceModel.findById(attendanceId)
          .populate('patientId')
          .populate('attendingClinician')
          .populate('diagnoses.diagnosisId')
          .populate('procedures.templateId')
          .populate('medications.stockItemId')
          .populate('labTests.templateId')
          .populate('billId'),
        InsuranceProviderModel.findById(insuranceProviderId)
      ]);

      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }
      if (!insuranceProvider) {
        return res.status(404).json({ message: 'Insurance provider not found' });
      }

      const patient: any = attendance.patientId;
      
      // Private Insurance Claim Form
      const privateClaimForm = {
        // Insurance Company Details
        insuranceCompany: {
          name: insuranceProvider.name,
          id: insuranceProvider._id,
          contact: insuranceProvider.contactInfo
        },
        
        // Patient Information
        patientInfo: {
          policyNumber: attendance.insurancePolicyNumber,
          fullName: `${patient?.firstName} ${patient?.lastName}`,
          dateOfBirth: patient?.dateOfBirth,
          gender: patient?.gender,
          relationshipToPolicyHolder: attendance.relationshipToPolicyHolder || 'Self'
        },
        
        // Treatment Details
        treatmentDetails: {
          dateOfService: attendance.dateTime,
          facilityName: process.env.FACILITY_NAME || 'Healthcare Facility',
          treatingPhysician: (attendance.attendingClinician as any)?.fullName,
          physicianLicense: (attendance.attendingClinician as any)?.licenseNumber,
          diagnosis: attendance.diagnoses.map(d => ({
            description: d.diagnosisId?.name,
            icdCode: d.diagnosisId?.icdCode,
            primary: d.primary
          })),
          procedures: attendance.procedures.map(p => ({
            description: p.templateId?.name,
            cptCode: p.templateId?.code,
            date: p.performedAt || p.scheduledDate,
            cost: p.cost
          }))
        },
        
        // Financial Details
        financialDetails: {
          totalCharges: attendance.totalBill,
          insuranceCoverage: attendance.totalBill * (insuranceProvider.coveragePercentage / 100),
          patientResponsibility: attendance.totalBill * ((100 - insuranceProvider.coveragePercentage) / 100),
          itemizedCharges: await generateClaimItems(attendance)
        },
        
        // Declaration
        declaration: {
          patientSignature: 'Electronically Generated',
          physicianSignature: (req as any).user.fullName,
          date: new Date()
        }
      };

      res.json({
        message: 'Private Insurance Claim Form generated successfully',
        claimForm: privateClaimForm,
        metadata: {
          insuranceProvider: insuranceProvider.name,
          coveragePercentage: insuranceProvider.coveragePercentage,
          totalAmount: attendance.totalBill
        }
      });
    } catch (error) {
      console.error('Error generating private insurance claim:', error);
      res.status(500).json({ message: 'Error generating private insurance claim', error });
    }
  }
];

export const getClaimById = async (req: Request, res: Response) => {
  try {
    const claim = await InsuranceClaimModel.findById(req.params.id)
      .populate('insuranceProviderId')
      .populate('patientId')
      .populate('attendanceId')
      .populate('billId')
      .populate('createdBy')
      .populate('updatedBy');

    if (!claim) {
      return res.status(404).json({ message: 'Insurance claim not found' });
    }

    res.json(claim);
  } catch (error) {
    console.error('Error fetching insurance claim:', error);
    res.status(500).json({ message: 'Error fetching insurance claim', error });
  }
};

// Helper function to generate claim items
async function generateClaimItems(attendance: any) {
  const items = [];

  // Diagnoses
  attendance.diagnoses.forEach((diag: any) => {
    if (diag.diagnosisId?.price) {
      items.push({
        type: 'Diagnosis',
        description: diag.diagnosisId.name,
        code: diag.diagnosisId.icdCode,
        quantity: 1,
        unitPrice: diag.diagnosisId.price,
        total: diag.diagnosisId.price
      });
    }
  });

  // Lab Tests
  attendance.labTests.forEach((lab: any) => {
    if (lab.templateId?.price) {
      items.push({
        type: 'Laboratory',
        description: lab.templateId.name,
        code: lab.templateId.code,
        quantity: 1,
        unitPrice: lab.templateId.price,
        total: lab.templateId.price
      });
    }
  });

  // Procedures
  attendance.procedures.forEach((proc: any) => {
    if (proc.templateId?.price || proc.cost) {
      items.push({
        type: 'Procedure',
        description: proc.templateId.name,
        code: proc.templateId.code,
        quantity: 1,
        unitPrice: proc.cost || proc.templateId.price,
        total: proc.cost || proc.templateId.price
      });
    }
  });

  // Medications
  attendance.medications.forEach((med: any) => {
    if (med.stockItemId?.sellingPrice) {
      items.push({
        type: 'Medication',
        description: med.stockItemId.name,
        dosage: med.dosage,
        quantity: med.quantity,
        unitPrice: med.stockItemId.sellingPrice,
        total: med.stockItemId.sellingPrice * med.quantity
      });
    }
  });

  return items;
}

// Submit Insurance Claim
export const submitInsuranceClaim = [
  body('insuranceProviderId').notEmpty().withMessage('Insurance provider ID is required'),
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { insuranceProviderId, attendanceId, preAuthNumber, notes } = req.body;

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Validate attendance and insurance provider
        const [attendance, insuranceProvider, bill] = await Promise.all([
          AttendanceModel.findById(attendanceId).session(session),
          InsuranceProviderModel.findById(insuranceProviderId).session(session),
          BillModel.findOne({ attendanceId }).session(session)
        ]);

        if (!attendance) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Attendance not found' });
        }
        if (!insuranceProvider) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Insurance provider not found' });
        }
        if (!bill) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Bill not found for this attendance' });
        }

        // Extract diagnosis and procedure codes
        const diagnosisCodes = attendance.diagnoses
          .map((d: any) => d.diagnosisId?.icdCode)
          .filter(Boolean);
        
        const procedureCodes = attendance.procedures
          .map((p: any) => p.templateId?.code)
          .filter(Boolean);

        // Create insurance claim
        const claimData = {
          billId: bill._id,
          patientId: attendance.patientId,
          insuranceProviderId: insuranceProvider._id,
          attendanceId: attendance._id,
          totalClaimAmount: attendance.totalBill,
          preAuthNumber: preAuthNumber,
          diagnosisCodes: diagnosisCodes,
          procedureCodes: procedureCodes,
          notes: notes,
          status: 'submitted',
          submissionDate: new Date(),
          createdBy: (req as any).user._id
        };

        const insuranceClaim = await InsuranceClaimModel.create([claimData], { session });

        // Update attendance with claim reference
        attendance.insuranceClaimId = insuranceClaim[0]._id;
        await attendance.save({ session });

        await session.commitTransaction();

        const populatedClaim = await InsuranceClaimModel.findById(insuranceClaim[0]._id)
          .populate('insuranceProviderId')
          .populate('patientId')
          .populate('attendanceId')
          .populate('billId');

        res.status(201).json({
          message: 'Insurance claim submitted successfully',
          claim: populatedClaim
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('Error submitting insurance claim:', error);
      res.status(500).json({ message: 'Error submitting insurance claim', error });
    }
  }
];

// Update Claim Status
export const updateClaimStatus = [
  body('status').isIn(['draft', 'submitted', 'processing', 'approved', 'partially_approved', 'rejected', 'paid'])
    .withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, approvedAmount, rejectedAmount, paidAmount, notes } = req.body;

      const updateData: any = {
        status,
        updatedBy: (req as any).user._id,
        updatedAt: new Date()
      };

      // Set dates based on status
      if (status === 'approved' || status === 'partially_approved') {
        updateData.approvalDate = new Date();
        updateData.approvedAmount = approvedAmount;
        updateData.rejectedAmount = rejectedAmount;
      }
      if (status === 'paid') {
        updateData.paymentDate = new Date();
        updateData.paidAmount = paidAmount;
      }
      if (notes) updateData.notes = notes;

      const claim = await InsuranceClaimModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('insuranceProviderId')
      .populate('patientId')
      .populate('attendanceId')
      .populate('billId');

      if (!claim) {
        return res.status(404).json({ message: 'Insurance claim not found' });
      }

      res.json({
        message: 'Claim status updated successfully',
        claim
      });
    } catch (error) {
      console.error('Error updating claim status:', error);
      res.status(500).json({ message: 'Error updating claim status', error });
    }
  }
];

// Get Claims with Filtering
export const getInsuranceClaims = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      insuranceProviderId, 
      patientId, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (insuranceProviderId) filter.insuranceProviderId = insuranceProviderId;
    if (patientId) filter.patientId = patientId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const claims = await InsuranceClaimModel.find(filter)
      .populate('insuranceProviderId', 'name type coveragePercentage')
      .populate('patientId', 'fullName folderNumber contact')
      .populate('attendanceId', 'attendanceNumber dateTime status')
      .populate('billId', 'billNumber totalAmount')
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const total = await InsuranceClaimModel.countDocuments(filter);

    res.json({
      claims,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching insurance claims:', error);
    res.status(500).json({ message: 'Error fetching insurance claims', error });
  }
};
