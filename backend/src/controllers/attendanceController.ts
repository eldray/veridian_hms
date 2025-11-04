// controllers/attendanceController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AttendanceModel from '../models/Attendance';
import PatientModel from '../models/Patient';
import AdmissionModel from '../models/Admission';
import BillModel from '../models/Bill';
import DiagnosisModel from '../models/Diagnosis';
import LabTestTemplateModel from '../models/LabTestTemplate';
import ProcedureTemplateModel from '../models/ProcedureTemplate';
import StockItemModel from '../models/StockItem'; // Added for medication pricing
import ServiceItemModel from '../models/ServiceItem'; // Assuming this exists for services
import { body, validationResult } from 'express-validator';

// Helper function to identify chronic conditions
const isChronicDiagnosis = (diagnosis: any): boolean => {
  const chronicConditions = [
    'hypertension', 'diabetes', 'asthma', 'copd', 'heart disease',
    'chronic kidney disease', 'arthritis', 'hiv', 'epilepsy'
  ];
  
  return chronicConditions.some(condition => 
    diagnosis.name?.toLowerCase().includes(condition) ||
    diagnosis.icdCode?.startsWith('I10') || // Hypertension
    diagnosis.icdCode?.startsWith('E11') || // Diabetes
    diagnosis.icdCode?.startsWith('J45')    // Asthma
  );
};

// Helper function to calculate bill
async function calculateBillForAttendance(attendanceId: string) {
  const attendance = await AttendanceModel.findById(attendanceId)
    .populate('diagnoses.diagnosisId', 'price')
    .populate('labTests.templateId', 'price')
    .populate('procedures.templateId', 'price')
    .populate('medications.stockItemId', 'sellingPrice')
    .populate('servicesRendered.serviceItemId', 'price')
    .populate('wardId', 'cashDailyRate insuranceDailyRate')
    .populate('admissionId', 'admissionDate dischargeDate status');
  
  if (!attendance) {
    throw new Error('Attendance not found');
  }

  let total = 0;

  // Diagnoses
  attendance.diagnoses.forEach((diag: any) => {
    if (diag.diagnosisId?.price) total += diag.diagnosisId.price;
  });

  // Lab tests
  attendance.labTests.forEach((lab: any) => {
    if (lab.templateId?.price) total += lab.templateId.price;
  });

  // Procedures
  attendance.procedures.forEach((proc: any) => {
    if (proc.templateId?.price) total += proc.templateId.price;
  });

  // Medications
  attendance.medications.forEach((med: any) => {
    if (med.stockItemId?.sellingPrice) total += med.stockItemId.sellingPrice * (med.quantity || 1);
  });

  // Services
  attendance.servicesRendered.forEach((srv: any) => {
    if (srv.serviceItemId?.price) total += srv.serviceItemId.price * (srv.quantity || 1);
  });

  // Add ward/bed costs if applicable
  if (attendance.attendanceType === 'inpatient' && attendance.admissionId && attendance.wardId) {
    const admission: any = attendance.admissionId;
    const admitDate = new Date(admission.admissionDate);
    let endDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    
    // Ignore time components
    admitDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Calculate inclusive days
    const diffMs = endDate.getTime() - admitDate.getTime();
    let days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    days = Math.max(1, days);  // Minimum 1 day
    
    const dailyRate = (attendance.paymentMode === 'cash') 
      ? attendance.wardId.cashDailyRate 
      : attendance.wardId.insuranceDailyRate;
    
    if (dailyRate) {
      total += dailyRate * days;
    }
  }

  attendance.totalBill = total;
  attendance.outstandingBalance = total - attendance.paidAmount;
  await attendance.save();

  // Update linked bill if exists
  if (attendance.billId) {
    const bill = await BillModel.findById(attendance.billId);
    if (bill) {
      bill.totalAmount = total;
      await bill.save();
    }
  }

  return total;
}

export const getAttendances = async (req: Request, res: Response) => {
  try {
    const { 
      patientId, 
      status, 
      attendanceType, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Build filter
    const filter: any = {};
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    if (attendanceType) filter.attendanceType = attendanceType;
    if (dateFrom || dateTo) {
      filter.dateTime = {};
      if (dateFrom) filter.dateTime.$gte = new Date(dateFrom as string);
      if (dateTo) filter.dateTime.$lte = new Date(dateTo as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const attendances = await AttendanceModel.find(filter)
      .populate('patientId', 'fullName folderNumber contact dateOfBirth gender')
      .populate('attendingClinician', 'fullName username role specialization')
      .populate('createdBy', 'fullName username')
      .populate('admissionId', 'admissionNumber status')
      .populate('bedId', 'bedNumber')
      .populate('wardId', 'wardName wardType')
      .populate('billId', 'billNumber totalAmount status')
      .populate('diagnoses.diagnosisId', 'name icdCode price')
      .populate('labTests.templateId', 'name price')
      .populate('procedures.templateId', 'name code price')
      .populate('medications.stockItemId', 'name brand form strength')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const total = await AttendanceModel.countDocuments(filter);

    res.json({
      attendances,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching attendances:', error);
    res.status(500).json({ message: 'Error fetching attendances', error });
  }
};

export const getAttendanceById = async (req: Request, res: Response) => {
  try {
      const { id } = req.params;

    // Check if the ID is "new" - this should return a different response
    if (id === 'new') {
      return res.status(400).json({ 
        message: 'Invalid attendance ID. "new" is not a valid ID.' 
      });
    }

    // Validate if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid attendance ID format' 
      });
    }
    const attendance = await AttendanceModel.findById(req.params.id)
      .populate('patientId', 'fullName folderNumber contact gender dateOfBirth')
      .populate('attendingClinician', 'fullName username role specialization licenseNumber')
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
      .populate('admissionId')
      .populate('bedId', 'bedNumber wardId')
      .populate('wardId', 'wardName wardType dailyRate')
      .populate('billId')
      .populate('diagnoses.diagnosisId')
      .populate('labTests.templateId')
      .populate('labTests.performedBy', 'fullName role')
      .populate('labTests.verifiedBy', 'fullName role')
      .populate('procedures.templateId')
      .populate('procedures.performedBy', 'fullName role')
      .populate('procedures.assistant', 'fullName role')
      .populate('medications.stockItemId')
      .populate('medications.prescribedBy', 'fullName role')
      .populate('medications.dispensedBy', 'fullName role')
      .populate('medications.administeredBy', 'fullName role')
      .populate('vitals.recordedBy', 'fullName role')
      .populate('progressNotes.createdBy', 'fullName role');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Error fetching attendance', error });
  }
};

export const createAttendance = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('attendanceType').isIn([
    'general_opd', 'specialist_consultation', 'antenatal_care', 
    'diagnostic_opd', 'emergency', 'other_opd', 'inpatient'
  ]).withMessage('Valid attendance type is required'),
  body('paymentMode').isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),
  body('attendingClinician').notEmpty().withMessage('Attending clinician is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Validate patient exists
        const patient = await PatientModel.findById(req.body.patientId).session(session);
        if (!patient) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Patient not found' });
        }

        // Validate NHIS CCC for NHIS patients
        if (req.body.paymentMode === 'nhis' && !req.body.nhisCCC) {
          await session.abortTransaction();
          return res.status(400).json({ message: 'NHIS CCC code is required for NHIS attendances' });
        }

        // Get previous attendances for this patient to carry forward data
        const previousAttendances = await AttendanceModel.find({
          patientId: req.body.patientId
        })
        .populate('diagnoses.diagnosisId')
        .sort({ dateTime: -1 })
        .limit(5)
        .session(session);

        const lastAttendance = previousAttendances[0];
        let autoPopulatedData: any = {};

        if (lastAttendance) {
          // Carry forward chronic diagnoses
          const chronicDiagnoses = lastAttendance.diagnoses.filter((d: any) => 
            d.diagnosisId && isChronicDiagnosis(d.diagnosisId)
          );

          autoPopulatedData.diagnoses = chronicDiagnoses.map((d: any) => ({
            diagnosisId: d.diagnosisId._id || d.diagnosisId,
            notes: `Carried forward from previous visit (${lastAttendance.attendanceNumber})`,
            primary: false,
            date: new Date(),
            createdBy: (req as any).user._id
          }));

          // Carry forward ongoing medications
          const ongoingMeds = lastAttendance.medications.filter((m: any) => 
            m.status === 'prescribed' || m.status === 'administered'
          );

          autoPopulatedData.medications = ongoingMeds.map((m: any) => ({
            stockItemId: m.stockItemId,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            quantity: m.quantity,
            route: m.route,
            instructions: m.instructions,
            status: 'prescribed',
            prescribedAt: new Date(),
            prescribedBy: (req as any).user._id,
            notes: `Continued from previous visit`
          }));

          autoPopulatedData.previousAttendanceId = lastAttendance._id;
        }

        // Create attendance with core data and carried-forward data
        const attendanceData = {
          ...req.body,
          ...autoPopulatedData,
          createdBy: (req as any).user._id,
          complaints: req.body.complaints || 'No complaints recorded',
          status: 'pending'
        };

        const attendance = await AttendanceModel.create([attendanceData], { session });
        
        // Create initial bill
        const bill = await BillModel.create([{
          billNumber: `BILL-${attendance[0].attendanceNumber}`, // Generate properly
          patientId: req.body.patientId,
          attendanceId: attendance[0]._id,
          billDate: new Date(),
          items: [], // Will be updated later
          totalAmount: 0,
          status: 'pending',
          createdBy: (req as any).user._id
        }], { session });

        attendance[0].billId = bill[0]._id;
        await attendance[0].save({ session });

        // If inpatient attendance, create admission record
        if (req.body.attendanceType === 'inpatient') {
          const admission = await AdmissionModel.create([{
            patientId: req.body.patientId,
            attendanceId: attendance[0]._id,
            admissionDate: new Date(),
            status: 'admitted',
            createdBy: (req as any).user._id
          }], { session });

          // Link admission to attendance
          attendance[0].admissionId = admission[0]._id;
          await attendance[0].save({ session });
        }

        await session.commitTransaction();

        // Populate and return the created attendance
        const populatedAttendance = await AttendanceModel.findById(attendance[0]._id)
          .populate('patientId', 'fullName folderNumber contact')
          .populate('attendingClinician', 'fullName username role')
          .populate('createdBy', 'fullName username')
          .populate('admissionId', 'admissionNumber status')
          .populate('diagnoses.diagnosisId')
          .populate('previousAttendanceId', 'attendanceNumber dateTime');

        res.status(201).json(populatedAttendance);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('Error creating attendance:', error);
      res.status(500).json({ message: 'Error creating attendance', error });
    }
  }
];

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const updateData = {
      ...req.body,
      updatedBy: (req as any).user._id,
      updatedAt: new Date()
    };

    const attendance = await AttendanceModel.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    )
    .populate('patientId')
    .populate('attendingClinician', 'fullName username role')
    .populate('createdBy', 'fullName username')
    .populate('updatedBy', 'fullName username')
    .populate('diagnoses.diagnosisId')
    .populate('labTests.templateId')
    .populate('procedures.templateId')
    .populate('admissionId')
    .populate('billId');
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    // Recalculate bill after update
    await calculateBillForAttendance(req.params.id);

    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Error updating attendance', error });
  }
};

export const addDiagnosisToAttendance = [
  body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { diagnosisId, notes, primary } = req.body;
      
      // Validate diagnosis exists
      const diagnosis = await DiagnosisModel.findById(diagnosisId);
      if (!diagnosis) {
        return res.status(404).json({ message: 'Diagnosis not found' });
      }

      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      // Add diagnosis to attendance
      const newDiagnosis = {
        diagnosisId: diagnosis._id,
        notes: notes || '',
        primary: primary || false,
        date: new Date(),
        createdBy: (req as any).user._id,
        icdCode: diagnosis.icdCode
      };

      if (primary) {
        attendance.diagnoses.forEach(d => {
          d.primary = false;
        });
      }

      attendance.diagnoses.push(newDiagnosis as any);
      await attendance.save();

      // AUTO-BILL: Update bill with new diagnosis
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('diagnoses.diagnosisId')
        .populate('billId');
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding diagnosis:', error);
      res.status(500).json({ message: 'Error adding diagnosis', error });
    }
  }
];

export const removeDiagnosisFromAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    const diagnosis = attendance.diagnoses.id(req.params.diagnosisId);
    if (!diagnosis) {
      return res.status(404).json({ message: 'Diagnosis not found' });
    }

    diagnosis.remove();
    await attendance.save();

    // Update bill after diagnosis removal
    await calculateBillForAttendance(req.params.id);

    const updatedAttendance = await AttendanceModel.findById(req.params.id)
      .populate('diagnoses.diagnosisId')
      .populate('billId');

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing diagnosis:', error);
    res.status(500).json({ message: 'Error removing diagnosis', error });
  }
};

export const addLabTestToAttendance = [
  body('templateId').notEmpty().withMessage('Lab test template ID is required'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { templateId, priority } = req.body;
      
      const labTemplate = await LabTestTemplateModel.findById(templateId);
      if (!labTemplate) {
        return res.status(404).json({ message: 'Lab test template not found' });
      }

      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const newLabTest = {
        templateId: labTemplate._id,
        status: 'requested',
        priority: priority || 'routine',
        requestedAt: new Date(),
        createdBy: (req as any).user._id
      };

      attendance.labTests.push(newLabTest as any);
      await attendance.save();

      // AUTO-BILL: Update bill with new lab test
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('labTests.templateId')
        .populate('billId');
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding lab test:', error);
      res.status(500).json({ message: 'Error adding lab test', error });
    }
  }
];

export const updateLabTestStatus = [
  body('status').isIn(['requested', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, result, normalRange, units, performedBy, verifiedBy, notes } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const labTest = attendance.labTests.id(req.params.labTestId);
      if (!labTest) {
        return res.status(404).json({ message: 'Lab test not found' });
      }

      labTest.status = status;
      if (result !== undefined) labTest.result = result;
      if (normalRange) labTest.normalRange = normalRange;
      if (units) labTest.units = units;
      if (performedBy) labTest.performedBy = performedBy;
      if (verifiedBy) labTest.verifiedBy = verifiedBy;
      if (notes) labTest.notes = notes;

      // Set completed date if status is completed
      if (status === 'completed' && !labTest.completedAt) {
        labTest.completedAt = new Date();
      }

      await attendance.save();

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('labTests.templateId')
        .populate('labTests.performedBy', 'fullName role')
        .populate('labTests.verifiedBy', 'fullName role')
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating lab test:', error);
      res.status(500).json({ message: 'Error updating lab test', error });
    }
  }
];

export const removeLabTestFromAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    const labTest = attendance.labTests.id(req.params.labTestId);
    if (!labTest) {
      return res.status(404).json({ message: 'Lab test not found' });
    }

    labTest.remove();
    await attendance.save();

    // Update bill after lab test removal
    await calculateBillForAttendance(req.params.id);

    const updatedAttendance = await AttendanceModel.findById(req.params.id)
      .populate('labTests.templateId')
      .populate('billId');

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing lab test:', error);
    res.status(500).json({ message: 'Error removing lab test', error });
  }
};

export const addProcedureToAttendance = [
  body('templateId').notEmpty().withMessage('Procedure template ID is required'),
  body('scheduledDate').optional().isISO8601().withMessage('Scheduled date must be valid'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { templateId, scheduledDate, notes } = req.body;
      
      const procedureTemplate = await ProcedureTemplateModel.findById(templateId);
      if (!procedureTemplate) {
        return res.status(404).json({ message: 'Procedure template not found' });
      }

      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const newProcedure = {
        templateId: procedureTemplate._id,
        status: 'scheduled',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        notes: notes || '',
        createdBy: (req as any).user._id
      };

      attendance.procedures.push(newProcedure as any);
      await attendance.save();

      // AUTO-BILL: Update bill with new procedure
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('procedures.templateId')
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding procedure:', error);
      res.status(500).json({ message: 'Error adding procedure', error });
    }
  }
];

export const updateProcedureStatus = [
  body('status').isIn(['scheduled', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, performedAt, performedBy, notes, cost } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const procedure = attendance.procedures.id(req.params.procedureId);
      if (!procedure) {
        return res.status(404).json({ message: 'Procedure not found' });
      }

      procedure.status = status;
      if (performedAt) procedure.performedAt = new Date(performedAt);
      if (performedBy) procedure.performedBy = performedBy;
      if (notes) procedure.notes = notes;
      if (cost) procedure.cost = cost;

      await attendance.save();

      // Update bill if procedure cost changed
      if (cost) {
        await calculateBillForAttendance(req.params.id);
      }

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('procedures.templateId')
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating procedure:', error);
      res.status(500).json({ message: 'Error updating procedure', error });
    }
  }
];

export const removeProcedureFromAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    const procedure = attendance.procedures.id(req.params.procedureId);
    if (!procedure) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    procedure.remove();
    await attendance.save();

    // Update bill after removal
    await calculateBillForAttendance(req.params.id);

    res.json({ message: 'Procedure removed successfully' });
  } catch (error) {
    console.error('Error removing procedure:', error);
    res.status(500).json({ message: 'Error removing procedure', error });
  }
};

export const addMedicationToAttendance = [
  body('name').notEmpty().withMessage('Medication name is required'),
  body('dosage').notEmpty().withMessage('Dosage is required'),
  body('frequency').notEmpty().withMessage('Frequency is required'),
  body('duration').notEmpty().withMessage('Duration is required'),
  body('quantity').isNumeric().withMessage('Quantity must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { stockItemId, name, dosage, frequency, duration, quantity = 1, route, instructions, notes } = req.body;

      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      // Validate stock item if provided
      let stockItem;
      if (stockItemId) {
        stockItem = await StockItemModel.findById(stockItemId);
        if (!stockItem) {
          return res.status(404).json({ message: 'Stock item not found' });
        }
      }

      const newMedication = {
        stockItemId,
        name: stockItem?.name || name,
        dosage,
        frequency: frequency || 'As directed',
        duration: duration || 'Until finished',
        quantity,
        route: route || 'Oral',
        instructions: instructions || '',
        status: 'prescribed',
        prescribedAt: new Date(),
        prescribedBy: (req as any).user._id,
        notes
      };

      attendance.medications.push(newMedication as any);
      await attendance.save();

      // AUTO-BILL: Update bill with new medication
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('medications.stockItemId')
        .populate('billId');
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding medication:', error);
      res.status(500).json({ message: 'Error adding medication', error });
    }
  }
];

export const updateMedicationStatus = [
  body('status').isIn(['prescribed', 'dispensed', 'administered', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, dispensedAt, dispensedBy, administeredAt, administeredBy } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const medication = attendance.medications.id(req.params.medicationId);
      if (!medication) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      medication.status = status;
      if (status === 'dispensed' && dispensedAt) {
        medication.dispensedAt = new Date(dispensedAt);
        medication.dispensedBy = dispensedBy || (req as any).user._id;
      }
      if (status === 'administered' && administeredAt) {
        medication.administeredAt = new Date(administeredAt);
        medication.administeredBy = administeredBy || (req as any).user._id;
      }

      await attendance.save();
      
      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('medications.stockItemId')
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating medication:', error);
      res.status(500).json({ message: 'Error updating medication', error });
    }
  }
];

export const removeMedicationFromAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    const medication = attendance.medications.id(req.params.medicationId);
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    medication.remove();
    await attendance.save();

    // Update bill after removal
    await calculateBillForAttendance(req.params.id);

    res.json({ message: 'Medication removed successfully' });
  } catch (error) {
    console.error('Error removing medication:', error);
    res.status(500).json({ message: 'Error removing medication', error });
  }
};

export const addServiceToAttendance = [
  body('serviceItemId').notEmpty().withMessage('Service item ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceItemId, quantity, notes } = req.body;
      
      const serviceItem = await ServiceItemModel.findById(serviceItemId);
      if (!serviceItem) {
        return res.status(404).json({ message: 'Service item not found' });
      }

      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const newService = {
        serviceItemId: serviceItem._id,
        quantity: quantity || 1,
        date: new Date(),
        performedBy: (req as any).user._id,
        notes
      };

      attendance.servicesRendered.push(newService as any);
      await attendance.save();

      // AUTO-BILL: Update bill with new service
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('servicesRendered.serviceItemId')
        .populate('billId');
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding service:', error);
      res.status(500).json({ message: 'Error adding service', error });
    }
  }
];

export const assignBedToAttendance = [
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('wardId').notEmpty().withMessage('Ward ID is required'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { bedId, wardId } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      // TODO: Validate bed availability, ward exists, etc.

      attendance.bedId = bedId;
      attendance.wardId = wardId;
      attendance.updatedBy = (req as any).user._id;
      await attendance.save();

      // AUTO-BILL: Update bill (e.g., add initial ward charge if applicable)
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('bedId')
        .populate('wardId')
        .populate('billId');
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error assigning bed:', error);
      res.status(500).json({ message: 'Error assigning bed', error });
    }
  }
];

export const addScanToAttendance = [
  body('scanType').notEmpty().withMessage('Scan type is required'),
  body('description').notEmpty().withMessage('Description is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scanType, description, bodyPart, priority } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const newScan = {
        scanType,
        description,
        bodyPart: bodyPart || '',
        status: 'requested',
        priority: priority || 'routine',
        requestedAt: new Date(),
        createdBy: (req as any).user._id
      };

      attendance.scans.push(newScan as any);
      await attendance.save();

      // AUTO-BILL: Update bill with new scan (you might want to add scan pricing)
      await calculateBillForAttendance(req.params.id);

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding scan:', error);
      res.status(500).json({ message: 'Error adding scan', error });
    }
  }
];

export const updateScanStatus = [
  body('status').isIn(['requested', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, result, findings, impression, performedBy, imageUrls } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const scan = attendance.scans.id(req.params.scanId);
      if (!scan) {
        return res.status(404).json({ message: 'Scan not found' });
      }

      scan.status = status;
      if (result) scan.result = result;
      if (findings) scan.findings = findings;
      if (impression) scan.impression = impression;
      if (performedBy) scan.performedBy = performedBy;
      if (imageUrls) scan.imageUrls = imageUrls;

      // Set completed date if status is completed
      if (status === 'completed' && !scan.completedAt) {
        scan.completedAt = new Date();
      }

      await attendance.save();

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('scans.performedBy', 'fullName role')
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating scan:', error);
      res.status(500).json({ message: 'Error updating scan', error });
    }
  }
];

export const removeScanFromAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    const scan = attendance.scans.id(req.params.scanId);
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    scan.remove();
    await attendance.save();

    // Update bill after removal
    await calculateBillForAttendance(req.params.id);

    res.json({ message: 'Scan removed successfully' });
  } catch (error) {
    console.error('Error removing scan:', error);
    res.status(500).json({ message: 'Error removing scan', error });
  }
};

export const addVitalsToAttendance = [
  body('bloodPressure').optional().isString(),
  body('temperature').optional().isNumeric(),
  body('pulse').optional().isNumeric(),
  body('respiration').optional().isNumeric(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const newVitals = {
        ...req.body,
        recordedAt: new Date(),
        recordedBy: (req as any).user._id
      };

      attendance.vitals.push(newVitals as any);
      await attendance.save();

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('vitals.recordedBy');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding vitals:', error);
      res.status(500).json({ message: 'Error adding vitals', error });
    }
  }
];

export const getVitalsByAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id)
      .select('vitals')
      .populate('vitals.recordedBy', 'fullName role');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    res.json(attendance.vitals);
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ message: 'Error fetching vitals', error });
  }
};

export const updateAttendanceStatus = [
  body('status').isIn(['pending', 'active', 'completed', 'cancelled', 'admitted', 'discharged']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, dischargeNotes, followUpDate } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      attendance.status = status;
      
      // Handle discharge specific fields
      if (status === 'discharged') {
        attendance.medicalNotes = dischargeNotes || attendance.medicalNotes;
        // Auto-generate final bill if not already done
        if (!attendance.billId) {
          await calculateBillForAttendance(req.params.id);
        }
      }

      // Handle follow-up date
      if (followUpDate) {
        attendance.followUpDate = new Date(followUpDate);
      }

      await attendance.save();

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('patientId', 'fullName folderNumber contact')
        .populate('attendingClinician', 'fullName role')
        .populate('billId');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating attendance status:', error);
      res.status(500).json({ message: 'Error updating attendance status', error });
    }
  }
];

export const addProgressNoteToAttendance = [
  body('note').notEmpty().withMessage('Progress note is required'),
  body('type').optional().isIn(['clinical', 'nursing', 'progress', 'discharge']).withMessage('Valid note type is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { note, type } = req.body;
      
      const attendance = await AttendanceModel.findById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      const newProgressNote = {
        note,
        type: type || 'clinical',
        createdBy: (req as any).user._id,
        createdAt: new Date()
      };

      attendance.progressNotes.push(newProgressNote as any);
      await attendance.save();

      const updatedAttendance = await AttendanceModel.findById(req.params.id)
        .populate('progressNotes.createdBy', 'fullName role');

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding progress note:', error);
      res.status(500).json({ message: 'Error adding progress note', error });
    }
  }
];

export const removeProgressNoteFromAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await AttendanceModel.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    const progressNote = attendance.progressNotes.id(req.params.noteId);
    if (!progressNote) {
      return res.status(404).json({ message: 'Progress note not found' });
    }

    // Only allow deletion by author or admin
    const currentUser = (req as any).user;
    if (progressNote.createdBy.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own progress notes' });
    }

    progressNote.remove();
    await attendance.save();

    const updatedAttendance = await AttendanceModel.findById(req.params.id)
      .populate('progressNotes.createdBy', 'fullName role');

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing progress note:', error);
    res.status(500).json({ message: 'Error removing progress note', error });
  }
};

export const calculateAttendanceBill = async (req: Request, res: Response) => {
  try {
    const total = await calculateBillForAttendance(req.params.id);
    
    res.json({
      message: 'Bill calculated successfully',
      totalBill: total
    });
  } catch (error) {
    console.error('Error calculating bill:', error);
    res.status(500).json({ message: 'Error calculating bill', error });
  }
};

export const getAttendanceStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.dateTime = {};
      if (startDate) matchStage.dateTime.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateTime.$lte = new Date(endDate as string);
    }

    const stats = await AttendanceModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAttendances: { $sum: 1 },
          pendingAttendances: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          activeAttendances: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedAttendances: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$totalBill' },
          byAttendanceType: {
            $push: {
              type: '$attendanceType',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalAttendances: 1,
          pendingAttendances: 1,
          activeAttendances: 1,
          completedAttendances: 1,
          totalRevenue: 1,
          attendanceTypeBreakdown: {
            $arrayToObject: {
              $map: {
                input: '$byAttendanceType',
                as: 'item',
                in: {
                  k: '$$item.type',
                  v: {
                    $sum: '$$item.count'
                  }
                }
              }
            }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalAttendances: 0,
      pendingAttendances: 0,
      activeAttendances: 0,
      completedAttendances: 0,
      totalRevenue: 0,
      attendanceTypeBreakdown: {}
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ message: 'Error fetching attendance stats', error });
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    
    // Find attendance with populated data
    const attendance = await AttendanceModel.findById(id)
      .populate('patientId', 'fullName')
      .session(session);
    
    if (!attendance) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Attendance not found' });
    }

    // Safety checks
    if (attendance.billId) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Cannot delete attendance with associated bill. Please delete the bill first.' 
      });
    }

    if (attendance.status === 'completed' || attendance.status === 'admitted') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Cannot delete ${attendance.status} attendance. Only pending or active attendances can be deleted.` 
      });
    }

    // Delete related vitals records if they exist
    try {
      const VitalsModel = mongoose.model('Vitals');
      await VitalsModel.deleteMany({ attendanceId: id }).session(session);
      console.log(`🧹 Cleaned up vitals for attendance ${id}`);
    } catch (vitalsError) {
      console.log('No vitals to clean up or vitals model not found');
    }

    // Delete the attendance
    await AttendanceModel.findByIdAndDelete(id).session(session);

    await session.commitTransaction();

    res.json({ 
      message: 'Attendance deleted successfully',
      deletedAttendance: {
        id: attendance._id,
        attendanceNumber: attendance.attendanceNumber,
        patientName: (attendance.patientId as any)?.fullName || 'Unknown Patient',
        date: attendance.dateTime,
        status: attendance.status
      },
      cleanup: {
        vitalsRemoved: true
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting attendance:', error);
    res.status(500).json({ 
      message: 'Error deleting attendance', 
      error: (error as Error).message 
    });
  } finally {
    session.endSession();
  }
};
