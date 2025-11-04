// controllers/billController.ts - COMPLETE VERSION
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Bill from '../models/Bill';
import BillItem from '../models/BillItem';
import Attendance from '../models/Attendance';
import Patient from '../models/Patient';

// COMPLETE createBill function that was missing
export const createBill = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('paymentMode').isIn(['cash', 'nhis', 'private_insurance', 'mixed']).withMessage('Valid payment mode is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const { patientId, attendanceId, billItems = [], ...billData } = req.body;

        // Validate attendance and patient
        const attendance = await Attendance.findById(attendanceId).session(session);
        const patient = await Patient.findById(patientId).session(session);
        
        if (!attendance) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Attendance not found' });
        }
        if (!patient) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Patient not found' });
        }

        // Calculate totals from bill items
        let subtotal = 0;
        let taxAmount = 0;
        let insuranceCovered = 0;
        const billItemIds = [];

        // Create bill items and calculate totals
        for (const item of billItems) {
          const itemTotal = item.unitPrice * item.quantity;
          const itemDiscount = item.discount || 0;
          const itemVat = item.vatAmount || 0;
          const itemInsuranceCovered = item.insuranceCovered || 0;
          const itemPatientPayable = item.patientPayable || 0;

          const billItem = await BillItem.create([{
            billId: null, // Will update after bill creation
            serviceType: item.serviceType,
            serviceReference: item.serviceReference,
            serviceName: item.serviceName,
            serviceCode: item.serviceCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: itemDiscount,
            vatAmount: itemVat,
            totalAmount: itemTotal,
            insuranceCovered: itemInsuranceCovered,
            patientPayable: itemPatientPayable,
            date: new Date(),
            createdBy: (req as any).user._id
          }], { session });

          billItemIds.push(billItem[0]._id);
          subtotal += itemTotal;
          taxAmount += itemVat;
          insuranceCovered += itemInsuranceCovered;
        }

        // Calculate final totals
        const discount = billData.discount || 0;
        const totalAmount = subtotal - discount + taxAmount;
        const patientPayable = totalAmount - insuranceCovered;

        // Create bill
        const bill = await Bill.create([{
          ...billData,
          patientId,
          attendanceId,
          admissionId: attendance.admissionId,
          billItems: billItemIds,
          subtotal,
          discount,
          taxAmount,
          totalAmount,
          insuranceCovered,
          patientPayable,
          paidAmount: 0,
          balance: patientPayable,
          status: patientPayable > 0 ? 'pending' : 'paid',
          createdBy: (req as any).user._id
        }], { session });

        // Update bill items with bill ID
        await BillItem.updateMany(
          { _id: { $in: billItemIds } },
          { $set: { billId: bill[0]._id } },
          { session }
        );

        // Update attendance with bill reference
        attendance.billId = bill[0]._id;
        await attendance.save({ session });

        await session.commitTransaction();

        // Populate and return the created bill
        const populatedBill = await Bill.findById(bill[0]._id)
          .populate('patientId', 'fullName folderNumber contact')
          .populate('attendanceId', 'attendanceNumber attendanceType')
          .populate('billItems')
          .populate('createdBy', 'fullName');

        res.status(201).json(populatedBill);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      res.status(500).json({ message: 'Error creating bill', error });
    }
  }
];

// REAL-TIME: Generate/Update bill when service is added to attendance
export const updateAttendanceBill = async (attendanceId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const attendance = await Attendance.findById(attendanceId)
      .populate('diagnoses.diagnosisId')
      .populate('labTests.templateId')
      .populate('procedures.templateId')
      .populate('medications.stockItemId')
      .session(session);

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    const billItems = [];
    let subtotal = 0;
    let taxAmount = 0;
    let insuranceCovered = 0;

    // Process diagnoses
    for (const diag of attendance.diagnoses) {
      if (diag.diagnosisId) {
        const diagnosis = diag.diagnosisId as any;
        const price = attendance.paymentMode === 'cash' 
          ? diagnosis.cashPrice 
          : diagnosis.insurancePrice;
        const vatAmount = diagnosis.isTaxable ? price * (diagnosis.vatRate / 100) : 0;
        const total = price + vatAmount;
        
        subtotal += price;
        taxAmount += vatAmount;
        
        const insuranceCover = attendance.paymentMode !== 'cash' ? total : 0;
        insuranceCovered += insuranceCover;
        
        billItems.push({
          serviceType: 'diagnosis',
          serviceReference: diagnosis._id,
          serviceName: diagnosis.name,
          serviceCode: diagnosis.icdCode,
          description: `Diagnosis: ${diagnosis.name}`,
          quantity: 1,
          unitPrice: price,
          vatAmount: vatAmount,
          totalAmount: total,
          insuranceCovered: insuranceCover,
          patientPayable: attendance.paymentMode === 'cash' ? total : 0
        });
      }
    }

    // Process lab tests
    for (const lab of attendance.labTests) {
      if (lab.templateId) {
        const labTest = lab.templateId as any;
        const price = attendance.paymentMode === 'cash'
          ? labTest.cashPrice
          : labTest.insurancePrice;
        const vatAmount = labTest.isTaxable ? price * (labTest.vatRate / 100) : 0;
        const total = price + vatAmount;
        
        subtotal += price;
        taxAmount += vatAmount;
        
        const insuranceCover = attendance.paymentMode !== 'cash' ? total : 0;
        insuranceCovered += insuranceCover;
        
        billItems.push({
          serviceType: 'lab_test',
          serviceReference: labTest._id,
          serviceName: labTest.name,
          serviceCode: `LAB-${labTest._id}`,
          description: `Lab Test: ${labTest.name}`,
          quantity: 1,
          unitPrice: price,
          vatAmount: vatAmount,
          totalAmount: total,
          insuranceCovered: insuranceCover,
          patientPayable: attendance.paymentMode === 'cash' ? total : 0
        });
      }
    }

    // Process medications
    for (const med of attendance.medications) {
      if (med.stockItemId) {
        const medication = med.stockItemId as any;
        const price = attendance.paymentMode === 'cash'
          ? medication.sellingPrice
          : medication.insurancePrice;
        const vatAmount = medication.isTaxable ? (price * med.quantity) * (medication.vatRate / 100) : 0;
        const total = (price * med.quantity) + vatAmount;
        
        subtotal += price * med.quantity;
        taxAmount += vatAmount;
        
        const insuranceCover = attendance.paymentMode !== 'cash' ? total : 0;
        insuranceCovered += insuranceCover;
        
        billItems.push({
          serviceType: 'medication',
          serviceReference: medication._id,
          serviceName: medication.name,
          serviceCode: `MED-${medication._id}`,
          description: `Medication: ${medication.name} - ${med.dosage}`,
          quantity: med.quantity,
          unitPrice: price,
          vatAmount: vatAmount,
          totalAmount: total,
          insuranceCovered: insuranceCover,
          patientPayable: attendance.paymentMode === 'cash' ? total : 0
        });
      }
    }

    // Process procedures
    for (const proc of attendance.procedures) {
      if (proc.templateId) {
        const procedure = proc.templateId as any;
        const price = attendance.paymentMode === 'cash'
          ? procedure.cashPrice
          : procedure.insurancePrice;
        const vatAmount = procedure.isTaxable ? price * (procedure.vatRate / 100) : 0;
        const total = price + vatAmount;
        
        subtotal += price;
        taxAmount += vatAmount;
        
        const insuranceCover = attendance.paymentMode !== 'cash' ? total : 0;
        insuranceCovered += insuranceCover;
        
        billItems.push({
          serviceType: 'procedure',
          serviceReference: procedure._id,
          serviceName: procedure.name,
          serviceCode: procedure.code,
          description: `Procedure: ${procedure.name}`,
          quantity: 1,
          unitPrice: price,
          vatAmount: vatAmount,
          totalAmount: total,
          insuranceCovered: insuranceCover,
          patientPayable: attendance.paymentMode === 'cash' ? total : 0
        });
      }
    }

    const totalAmount = subtotal + taxAmount;
    const patientPayable = totalAmount - insuranceCovered;

    // Check if bill already exists
    let bill = await Bill.findOne({ attendanceId }).session(session);

    if (bill) {
      // Update existing bill
      bill.subtotal = subtotal;
      bill.taxAmount = taxAmount;
      bill.totalAmount = totalAmount;
      bill.insuranceCovered = insuranceCovered;
      bill.patientPayable = patientPayable;
      bill.balance = patientPayable - bill.paidAmount;
      bill.updatedBy = (req as any)?.user?._id;
      
      // Update bill status based on payments
      if (bill.balance <= 0 && bill.paidAmount > 0) {
        bill.status = 'paid';
      } else if (bill.paidAmount > 0) {
        bill.status = 'partial';
      } else {
        bill.status = 'pending';
      }
      
      await bill.save({ session });

      // Update existing bill items
      await BillItem.deleteMany({ billId: bill._id }).session(session);
      
    } else {
      // Create new bill
      bill = await Bill.create([{
        patientId: attendance.patientId,
        attendanceId: attendance._id,
        admissionId: attendance.admissionId,
        paymentMode: attendance.paymentMode,
        subtotal,
        taxAmount,
        totalAmount,
        insuranceCovered,
        patientPayable,
        paidAmount: 0,
        balance: patientPayable,
        status: patientPayable > 0 ? 'pending' : 'paid',
        claimStatus: attendance.paymentMode !== 'cash' ? 'pending' : 'not_required',
        createdBy: (req as any)?.user?._id
      }], { session });
      bill = bill[0];
    }

    // Create bill items
    const billItemDocs = [];
    for (const item of billItems) {
      const billItem = await BillItem.create([{
        ...item,
        billId: bill._id,
        date: new Date(),
        createdBy: (req as any)?.user?._id
      }], { session });
      billItemDocs.push(billItem[0]._id);
    }

    // Update bill with bill items
    bill.billItems = billItemDocs;
    await bill.save({ session });

    // Update attendance with bill reference
    attendance.billId = bill._id;
    attendance.totalBill = totalAmount;
    attendance.outstandingBalance = patientPayable;
    await attendance.save({ session });

    await session.commitTransaction();

    return {
      bill,
      summary: {
        subtotal,
        taxAmount,
        totalAmount,
        insuranceCovered,
        patientPayable,
        balance: patientPayable - (bill.paidAmount || 0)
      }
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// API endpoint to manually generate/update bill
export const generateBillFromAttendance = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    
    const result = await updateAttendanceBill(attendanceId);
    
    const populatedBill = await Bill.findById(result.bill._id)
      .populate('patientId', 'fullName folderNumber contact')
      .populate('attendanceId', 'attendanceNumber attendanceType')
      .populate('billItems')
      .populate('createdBy', 'fullName');

    res.json({
      message: 'Bill generated/updated successfully',
      bill: populatedBill,
      summary: result.summary
    });
  } catch (error) {
    console.error('Error generating bill:', error);
    res.status(500).json({ message: 'Error generating bill', error });
  }
};

// Keep your existing functions (getBills, getBillById, addPaymentToBill, generateBillReport)
// ... [Your existing functions remain the same]

export const getBills = async (req: Request, res: Response) => {
  try {
    const { patientId, status, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    
    const filter: any = {};
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.billDate = {};
      if (dateFrom) filter.billDate.$gte = new Date(dateFrom as string);
      if (dateTo) filter.billDate.$lte = new Date(dateTo as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const bills = await Bill.find(filter)
      .populate('patientId', 'fullName folderNumber contact')
      .populate('attendanceId', 'attendanceNumber attendanceType')
      .populate('admissionId', 'admissionNumber')
      .populate('insuranceProviderId', 'name')
      .populate('createdBy', 'fullName')
      .populate({
        path: 'billItems',
        populate: {
          path: 'serviceItemId',
          select: 'name code categoryId'
        }
      })
      .sort({ billDate: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Bill.countDocuments(filter);

    res.json({
      bills,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Error fetching bills', error });
  }
};

export const getBillById = async (req: Request, res: Response) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('patientId')
      .populate('attendanceId')
      .populate('admissionId')
      .populate('insuranceProviderId')
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .populate({
        path: 'billItems',
        populate: {
          path: 'serviceItemId',
          populate: {
            path: 'categoryId',
            select: 'name code'
          }
        }
      });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ message: 'Error fetching bill', error });
  }
};

export const addPaymentToBill = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentMode').isIn(['cash', 'card', 'mobile_money', 'bank_transfer']).withMessage('Valid payment mode is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, paymentMode, reference } = req.body;
      
      const bill = await Bill.findById(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: 'Bill not found' });
      }

      bill.paidAmount += amount;
      await bill.save();

      const updatedBill = await Bill.findById(bill._id)
        .populate('patientId', 'fullName folderNumber contact')
        .populate('attendanceId', 'attendanceNumber attendanceType')
        .populate({
          path: 'billItems',
          populate: {
            path: 'serviceItemId',
            populate: {
              path: 'categoryId',
              select: 'name code'
            }
          }
        });

      res.json({
        message: 'Payment added successfully',
        bill: updatedBill,
        payment: {
          amount,
          paymentMode,
          reference,
          date: new Date()
        }
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      res.status(500).json({ message: 'Error adding payment', error });
    }
  }
];

export const generateBillReport = async (req: Request, res: Response) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('patientId')
      .populate('attendanceId')
      .populate('insuranceProviderId')
      .populate('createdBy', 'fullName')
      .populate({
        path: 'billItems',
        populate: {
          path: 'serviceItemId',
          populate: {
            path: 'categoryId',
            select: 'name'
          }
        }
      });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Generate comprehensive report
    const report = {
      billInfo: {
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        status: bill.status
      },
      patientInfo: {
        name: (bill.patientId as any).fullName,
        folderNumber: (bill.patientId as any).folderNumber,
        contact: (bill.patientId as any).contact
      },
      attendanceInfo: {
        attendanceNumber: (bill.attendanceId as any).attendanceNumber,
        type: (bill.attendanceId as any).attendanceType,
        date: (bill.attendanceId as any).dateTime
      },
      items: bill.billItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalAmount,
        category: item.serviceItemId.categoryId.name
      })),
      financialSummary: {
        subtotal: bill.subtotal,
        discount: bill.discount,
        tax: bill.taxAmount,
        total: bill.totalAmount,
        insuranceCovered: bill.insuranceCovered,
        patientPayable: bill.patientPayable,
        paidAmount: bill.paidAmount,
        balance: bill.balance
      }
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating bill report:', error);
    res.status(500).json({ message: 'Error generating bill report', error });
  }
};
