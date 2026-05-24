// modules/encounter/EncounterController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { EncounterService } from './EncounterService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class EncounterController {
  private service: EncounterService;

  constructor() {
    this.service = new EncounterService();
  }

  // ============================================
  // CREATE ENCOUNTER
  // ============================================
  create = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),

    body('attendanceType').isIn([
      'emergency_acute',
      'antenatal',
      'postnatal',
      'chronic_followup',
      'specialist_consultation',
      'delivery',
      'surgery',
      'general_consultation',
    ]).withMessage('Valid attendance type is required'),

    body('paymentMode').isIn(['cash', 'nhis', 'private_insurance', 'corporate'])
      .withMessage('Valid payment mode is required'),

    body('encounterCategory').optional().isIn(['opd', 'ipd', 'daycase'])
      .withMessage('Valid encounter category is required'),

    body('visitCategory').optional().isIn(['general', 'specialist', 'emergency', 'inpatient'])
      .withMessage('Valid visit category is required'),

    body('nhisCCC').optional().custom((value, { req }) => {
      if (req.body.paymentMode === 'nhis') {
        if (!value || !/^\d{5}$/.test(value)) {
          throw new Error('NHIS CCC number must be exactly 5 digits');
        }
      }
      return true;
    }),

    body('corporateAccountId').optional().custom((value, { req }) => {
      if (req.body.paymentMode === 'corporate' && !value) {
        throw new Error('Corporate Account ID is required for corporate payment mode');
      }
      return true;
    }),

    body('complaints').optional().isString(),
    body('medicalNotes').optional().isString(),
    body('historyPresentingComplaint').optional().isString(),
    body('onsetDurationQuality').optional().isString(),
    body('physicalExamination').optional().isString(),
    body('treatmentPlan').optional().isString(),
    body('followUpDate').optional().isISO8601().toDate(),
    body('referringFacility').optional().isString(),
    body('gdrgCategory').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const encounter = await this.service.createEncounter(req.body, user.id);

        res.status(201).json({
          success: true,
          data: encounter,
          message: 'Encounter created successfully',
        });
      } catch (error) {
        console.error('Error creating encounter:', error);
        res.status(500).json({
          message: 'Error creating encounter',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // GET ALL ENCOUNTERS
  // ============================================
  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        patientId: req.query.patientId as string,
        attendanceType: req.query.attendanceType as string,
        encounterCategory: req.query.encounterCategory as string,
        visitCategory: req.query.visitCategory as string,
        status: req.query.status as 'pending' | 'completed' | 'cancelled' | 'admitted' | 'discharged' | undefined,
        paymentMode: req.query.paymentMode as 'cash' | 'nhis' | 'private_insurance' | 'corporate' | undefined,
        insuranceProviderId: req.query.insuranceProviderId as string,
        wardId: req.query.wardId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await this.service.getEncounters(filters);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error fetching encounters:', error);
      res.status(500).json({
        message: 'Error fetching encounters',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // GET ENCOUNTER BY ID
  // ============================================

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      console.log('🔍 getById called with id:', id);  // ✅ Add this debug log
      
      if (id === 'daycase') {
        // This should never happen if routes are ordered correctly
        console.error('❌ "daycase" being treated as ID - route order issue!');
        return res.status(400).json({ message: 'Invalid encounter ID' });
      }
      
      const encounter = await this.service.getEncounterById(id);
      res.json({
        success: true,
        data: encounter,
      });
    } catch (error) {
      console.error('Error fetching encounter:', error);
      res.status(404).json({
        message: 'Encounter not found',
        error: (error as Error).message,
      });
    }
  };
  // ============================================
  // UPDATE ENCOUNTER
  // ============================================
  update = [
    body('attendanceType').optional().isIn([
      'emergency_acute', 'antenatal', 'postnatal', 'chronic_followup',
      'specialist_consultation', 'delivery', 'surgery', 'general_consultation',
    ]).withMessage('Valid attendance type is required'),

    body('encounterCategory').optional().isIn(['opd', 'ipd', 'daycase'])
      .withMessage('Valid encounter category is required'),

    body('visitCategory').optional().isIn(['general', 'specialist', 'emergency', 'inpatient'])
      .withMessage('Valid visit category is required'),

    body('complaints').optional().isString(),
    body('medicalNotes').optional().isString(),
    body('historyPresentingComplaint').optional().isString(),
    body('onsetDurationQuality').optional().isString(),
    body('physicalExamination').optional().isString(),
    body('treatmentPlan').optional().isString(),
    body('followUpDate').optional().isISO8601().toDate(),
    body('gdrgCategory').optional().isString(),
    body('referringFacility').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const encounter = await this.service.updateEncounter(id, req.body, user.id);

        res.json({
          success: true,
          data: encounter,
          message: 'Encounter updated successfully',
        });
      } catch (error) {
        console.error('Error updating encounter:', error);
        res.status(500).json({
          message: 'Error updating encounter',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // UPDATE ENCOUNTER STATUS
  // ============================================
  updateStatus = [
    body('status').isIn(['pending', 'completed', 'cancelled', 'admitted', 'discharged'])
      .withMessage('Valid status is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { status } = req.body;

        const encounter = await this.service.updateEncounterStatus(id, status);

        res.json({
          success: true,
          data: encounter,
          message: `Encounter status updated to ${status}`,
        });
      } catch (error) {
        console.error('Error updating encounter status:', error);
        res.status(500).json({
          message: 'Error updating encounter status',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // ADD DIAGNOSIS
  // ============================================
  addDiagnosis = [
    body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
    body('diagnosisType').optional().isIn(['primary', 'additional', 'provisional'])
      .withMessage('Valid diagnosis type required'),
    body('notes').optional().isString(),
    body('presentOnAdmission').optional().isIn(['Y', 'N', 'U'])
      .withMessage('Present on admission must be Y, N, or U'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { diagnosisId, diagnosisType = 'provisional', notes, presentOnAdmission } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const diagnosis = await this.service.addDiagnosis(id, {
          diagnosisId,
          diagnosisType: diagnosisType as 'primary' | 'additional' | 'provisional',
          notes,
          presentOnAdmission,
        }, user.id);

        res.json({
          success: true,
          data: diagnosis,
          message: 'Diagnosis added successfully',
        });
      } catch (error) {
        console.error('Error adding diagnosis:', error);
        res.status(500).json({
          message: 'Error adding diagnosis',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // SET PRIMARY DIAGNOSIS
  // ============================================
  setPrimaryDiagnosis = [
    body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { diagnosisId } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const diagnosis = await this.service.setPrimaryDiagnosis(id, diagnosisId, user.id);

        res.json({
          success: true,
          data: diagnosis,
          message: 'Primary diagnosis set successfully',
        });
      } catch (error) {
        console.error('Error setting primary diagnosis:', error);
        res.status(500).json({
          message: 'Error setting primary diagnosis',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // REMOVE DIAGNOSIS
  // ============================================
  removeDiagnosis = async (req: AuthRequest, res: Response) => {
    try {
      const { id, diagnosisId } = req.params;

      await this.service.removeDiagnosis(id, diagnosisId);

      res.json({
        success: true,
        message: 'Diagnosis removed successfully',
      });
    } catch (error) {
      console.error('Error removing diagnosis:', error);
      res.status(500).json({
        message: 'Error removing diagnosis',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADD VITALS
  // ============================================
  addVitals = [
    body('bloodPressure').optional().isString(),
    body('temperature').optional().isFloat(),
    body('pulse').optional().isInt(),
    body('respiration').optional().isInt(),
    body('spo2').optional().isFloat(),
    body('weight').optional().isFloat(),
    body('height').optional().isFloat(),
    body('muac').optional().isFloat(),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const {
          bloodPressure, temperature, pulse, respiration,
          spo2, weight, height, muac, notes,
        } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const vitals = await this.service.addVitals(id, {
          bloodPressure, temperature, pulse, respiration,
          spo2, weight, height, muac, notes,
        }, user.id);

        res.json({
          success: true,
          data: vitals,
          message: 'Vitals recorded successfully',
        });
      } catch (error) {
        console.error('Error adding vitals:', error);
        res.status(500).json({
          message: 'Error adding vitals',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // UPDATE VITALS
  // ============================================
  updateVitals = [
    body('bloodPressure').optional().isString(),
    body('temperature').optional().isFloat(),
    body('pulse').optional().isInt(),
    body('respiration').optional().isInt(),
    body('spo2').optional().isFloat(),
    body('weight').optional().isFloat(),
    body('height').optional().isFloat(),
    body('muac').optional().isFloat(),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const { vitalsId } = req.params;
        const updates = req.body;

        const vitals = await this.service.updateVitals(vitalsId, updates);

        res.json({
          success: true,
          data: vitals,
          message: 'Vitals updated successfully',
        });
      } catch (error) {
        console.error('Error updating vitals:', error);
        res.status(500).json({
          message: 'Error updating vitals',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // DELETE VITALS
  // ============================================
  deleteVitals = async (req: AuthRequest, res: Response) => {
    try {
      const { vitalsId } = req.params;

      await this.service.deleteVitals(vitalsId);

      res.json({
        success: true,
        message: 'Vitals deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting vitals:', error);
      res.status(500).json({
        message: 'Error deleting vitals',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADD PRESCRIPTION
  // ============================================
  addPrescription = [
    body('stockItemId').notEmpty().withMessage('Stock item ID is required'),
    body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
    body('name').notEmpty().withMessage('Medication name is required'),
    body('dosage').notEmpty().withMessage('Dosage is required'),
    body('frequency').notEmpty().withMessage('Frequency is required'),
    body('duration').notEmpty().withMessage('Duration is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('route').optional().isString(),
    body('instructions').optional().isString(),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
          stockItemId, serviceCatalogId, name, dosage,
          frequency, duration, route, instructions, quantity, notes,
        } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const prescription = await this.service.addPrescription(id, {
          stockItemId, serviceCatalogId, name, dosage,
          frequency, duration, route, instructions, quantity, notes,
        }, user.id);

        res.json({
          success: true,
          data: prescription,
          message: 'Prescription added successfully',
        });
      } catch (error) {
        console.error('Error adding prescription:', error);
        res.status(500).json({
          message: 'Error adding prescription',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // DISPENSE MEDICATION
  // ============================================
  dispenseMedication = [
    body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
    body('batchNumber').optional().isString(),
    body('expiryDate').optional().isISO8601().toDate(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { encounterId, medicationId } = req.params;
        const { quantity, batchNumber, expiryDate } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const medication = await this.service.dispenseMedication(
          encounterId,
          medicationId,
          quantity,
          user.id,
          batchNumber,
          expiryDate,
        );

        res.json({
          success: true,
          data: medication,
          message: 'Medication dispensed successfully',
        });
      } catch (error) {
        console.error('Error dispensing medication:', error);
        res.status(500).json({
          message: 'Error dispensing medication',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // REMOVE MEDICATION
  // ============================================
  removeMedication = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId, medicationId } = req.params;

      await this.service.removeMedication(encounterId, medicationId);

      res.json({
        success: true,
        message: 'Medication removed successfully',
      });
    } catch (error) {
      console.error('Error removing medication:', error);
      res.status(500).json({
        message: 'Error removing medication',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADD LAB TEST
  // ============================================
  addLabTest = [
    body('templateId').notEmpty().withMessage('Lab test template ID is required'),
    body('serviceCatalogId').optional().isString(),
    body('priority').optional().isIn(['routine', 'urgent', 'stat'])
      .withMessage('Valid priority is required'),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { templateId, serviceCatalogId, priority = 'routine', notes } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const labOrder = await this.service.addLabOrder(id, {
          templateId,
          serviceCatalogId,
          priority: priority as 'routine' | 'urgent' | 'stat',
          notes,
        }, user.id);

        res.json({
          success: true,
          data: labOrder,
          message: 'Lab order added successfully',
        });
      } catch (error) {
        console.error('Error adding lab order:', error);
        res.status(500).json({
          message: 'Error adding lab order',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // UPDATE LAB TEST STATUS
  // ============================================
  updateLabTestStatus = [
    body('status').isIn(['requested', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Valid status is required'),
    body('result').optional(),
    body('normalRange').optional().isString(),
    body('units').optional().isString(),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { labOrderId } = req.params;
        const { status, result, normalRange, units, notes } = req.body;
        const user = req.user;

        const labOrder = await this.service.updateLabOrderStatus(
          labOrderId,
          status,
          { result, normalRange, units, notes },
          user?.id,
        );

        res.json({
          success: true,
          data: labOrder,
          message: 'Lab order status updated successfully',
        });
      } catch (error) {
        console.error('Error updating lab order status:', error);
        res.status(500).json({
          message: 'Error updating lab order status',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // REMOVE LAB ORDER
  // ============================================
  removeLabTest = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId, labOrderId } = req.params;

      await this.service.removeLabOrder(encounterId, labOrderId);

      res.json({
        success: true,
        message: 'Lab order removed successfully',
      });
    } catch (error) {
      console.error('Error removing lab order:', error);
      res.status(500).json({
        message: 'Error removing lab order',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADD SCAN
  // ============================================
  addScan = [
    body('templateId').notEmpty().withMessage('Scan template ID is required'),
    body('serviceCatalogId').optional().isString(),
    body('priority').optional().isIn(['routine', 'urgent'])
      .withMessage('Valid priority is required'),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { templateId, serviceCatalogId, priority = 'routine', notes } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const scan = await this.service.addScan(id, {
          templateId,
          serviceCatalogId,
          priority: priority as 'routine' | 'urgent',
          notes,
        }, user.id);

        res.json({
          success: true,
          data: scan,
          message: 'Scan added successfully',
        });
      } catch (error) {
        console.error('Error adding scan:', error);
        res.status(500).json({
          message: 'Error adding scan',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // UPDATE SCAN STATUS
  // ============================================
  updateScanStatus = [
    body('status').isIn(['requested', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Valid status is required'),
    body('result').optional().isString(),
    body('findings').optional().isString(),
    body('impression').optional().isString(),
    body('imageUrls').optional().isArray(),
    body('performedById').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { scanId } = req.params;
        const { status, result, findings, impression, imageUrls, performedById } = req.body;

        const scan = await this.service.updateScanStatus(scanId, status, {
          result, findings, impression, imageUrls, performedById,
        });

        res.json({
          success: true,
          data: scan,
          message: 'Scan status updated successfully',
        });
      } catch (error) {
        console.error('Error updating scan status:', error);
        res.status(500).json({
          message: 'Error updating scan status',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // REMOVE SCAN
  // ============================================
  removeScan = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId, scanId } = req.params;

      await this.service.removeScan(encounterId, scanId);

      res.json({
        success: true,
        message: 'Scan removed successfully',
      });
    } catch (error) {
      console.error('Error removing scan:', error);
      res.status(500).json({
        message: 'Error removing scan',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADD PROCEDURE
  // ============================================
  addProcedure = [
    body('templateId').notEmpty().withMessage('Procedure template ID is required'),
    body('serviceCatalogId').optional().isString(),
    body('scheduledDate').optional().isISO8601().toDate(),
    body('performedById').optional().isString(),
    body('assistantId').optional().isString(),
    body('notes').optional().isString(),
    body('duration').optional().isInt({ min: 1 }),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
          templateId, serviceCatalogId, scheduledDate,
          performedById, assistantId, notes, duration,
        } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const procedure = await this.service.addProcedure(id, {
          templateId,
          serviceCatalogId,
          scheduledDate,
          performedById,
          assistantId,
          notes,
          duration,
        }, user.id);

        res.json({
          success: true,
          data: procedure,
          message: 'Procedure added successfully',
        });
      } catch (error) {
        console.error('Error adding procedure:', error);
        res.status(500).json({
          message: 'Error adding procedure',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // UPDATE PROCEDURE STATUS
  // ============================================
  updateProcedureStatus = [
    body('status').isIn(['scheduled', 'completed', 'cancelled'])
      .withMessage('Valid status is required'),
    body('performedById').optional().isString(),
    body('notes').optional().isString(),
    body('complications').optional().isString(),
    body('outcome').optional().isString(),
    body('anesthesiaNotes').optional().isString(),
    body('intraOperativeNotes').optional().isString(),
    body('postOperativeNotes').optional().isString(),
    body('bloodLoss').optional().isInt({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { procedureId } = req.params;
        const {
          status, performedById, notes, complications,
          outcome, anesthesiaNotes, intraOperativeNotes,
          postOperativeNotes, bloodLoss, duration,
        } = req.body;

        const procedure = await this.service.updateProcedureStatus(procedureId, status, {
          performedById, notes, complications, outcome,
          anesthesiaNotes, intraOperativeNotes, postOperativeNotes,
          bloodLoss, duration,
        });

        res.json({
          success: true,
          data: procedure,
          message: 'Procedure status updated successfully',
        });
      } catch (error) {
        console.error('Error updating procedure status:', error);
        res.status(500).json({
          message: 'Error updating procedure status',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // REMOVE PROCEDURE
  // ============================================
  removeProcedure = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId, procedureId } = req.params;

      await this.service.removeProcedure(encounterId, procedureId);

      res.json({
        success: true,
        message: 'Procedure removed successfully',
      });
    } catch (error) {
      console.error('Error removing procedure:', error);
      res.status(500).json({
        message: 'Error removing procedure',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADD SERVICE TO ENCOUNTER
  // ============================================
  addService = [
    body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Valid quantity is required'),
    body('notes').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { serviceCatalogId, quantity = 1, notes } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const result = await this.service.addService(id, {
          serviceCatalogId,
          quantity,
          notes,
        }, user.id);

        res.json({
          success: true,
          data: result,
          message: 'Service added successfully',
        });
      } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({
          message: 'Error adding service',
          error: (error as Error).message,
        });
      }
    },
  ];

  // ============================================
  // REMOVE SERVICE FROM ENCOUNTER
  // ============================================
  removeService = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId, serviceRenderedId } = req.params;

      await this.service.removeService(encounterId, serviceRenderedId);

      res.json({
        success: true,
        message: 'Service removed successfully',
      });
    } catch (error) {
      console.error('Error removing service:', error);
      res.status(500).json({
        message: 'Error removing service',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // WORKLISTS (CLINICAL QUEUES)
  // ============================================
  getVitalsWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getVitalsWorklist();
      res.json({ success: true, data: worklist, count: worklist.length });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vitals worklist', error: (error as Error).message });
    }
  };

  getMedicalWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getMedicalWorklist();
      res.json({ success: true, data: worklist, count: worklist.length });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching medical worklist', error: (error as Error).message });
    }
  };

  getLabWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getLabWorklist();
      res.json({ success: true, data: worklist, count: worklist.length });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching lab worklist', error: (error as Error).message });
    }
  };

  getPharmacyWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getPharmacyWorklist();
      res.json({ success: true, data: worklist, count: worklist.length });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching pharmacy worklist', error: (error as Error).message });
    }
  };

  // ============================================
  // DELETE ENCOUNTER
  // ============================================
  delete = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await this.service.deleteEncounter(id);

      res.json({
        success: true,
        message: 'Encounter deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting encounter:', error);
      res.status(500).json({
        message: 'Error deleting encounter',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // GET ENCOUNTER STATISTICS
  // ============================================
  getStats = async (req: AuthRequest, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.query;

      const stats = await this.service.getEncounterStats(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined,
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching encounter statistics:', error);
      res.status(500).json({
        message: 'Error fetching encounter statistics',
        error: (error as Error).message,
      });
    }
  };

  // ============================================
  // ADMISSION ROUTES (Formal IPD)
  // ============================================

  // CREATE FORMAL ADMISSION FROM IPD ENCOUNTER
  createAdmission = [
    body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
    body('admissionType').optional().isIn(['emergency', 'elective', 'transfer']),
    body('admissionSource').optional().isIn(['home', 'referral', 'another_facility', 'opd', 'emergency']),

    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }

        const user = req.user;
        if (!user) {
          res.status(401).json({ message: 'User authentication required' });
          return;
        }

        const admission = await this.service.createFormalAdmission(req.body, user.id);

        res.status(201).json({
          success: true,
          data: admission,
          message: 'Formal admission created successfully'
        });
      } catch (error) {
        console.error('Error creating admission:', error);
        res.status(500).json({
          message: 'Error creating admission',
          error: (error as Error).message
        });
      }
    }
  ];

  // GET ALL FORMAL ADMISSIONS
  getAllAdmissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        status,
        wardId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = req.query;

      const result = await this.service.getAllAdmissions({
        status: status as any,
        wardId: wardId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching admissions:', error);
      res.status(500).json({
        message: 'Error fetching admissions',
        error: (error as Error).message
      });
    }
  };

  // ADD DAILY NOTES TO ADMISSION
  addDailyNotes = [
    body('notes').notEmpty().withMessage('Notes are required'),
    body('noteType').optional().isString(),

    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
          res.status(401).json({ message: 'User authentication required' });
          return;
        }

        const result = await this.service.addDailyNotes(id, req.body, user.id);

        res.json({
          success: true,
          data: result.note,
          message: 'Daily notes added successfully'
        });
      } catch (error) {
        console.error('Error adding daily notes:', error);
        res.status(500).json({
          message: 'Error adding daily notes',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // DAYCASE/OBSERVATION ROUTES
  // ============================================

  // GET DAYCASE PATIENTS (Observation/Detention)
  getDaycasePatients = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        status,
        wardId,
        page = 1,
        limit = 50
      } = req.query;

      // Call the service method (not admissionService directly)
      const result = await this.service.getDaycasePatients({
        status: status as any,
        wardId: wardId as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching daycase patients:', error);
      res.status(500).json({
        message: 'Error fetching daycase patients',
        error: (error as Error).message
      });
    }
  };

  // CONVERT DAYCASE TO IPD
  convertDaycaseToIPD = [
    body('admissionType').optional().isIn(['emergency', 'elective', 'transfer']),

    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
          res.status(401).json({ message: 'User authentication required' });
          return;
        }

        const admission = await this.service.convertDaycaseToIPD(id, req.body, user.id);

        res.json({
          success: true,
          data: admission,
          message: 'Daycase converted to IPD successfully'
        });
      } catch (error) {
        console.error('Error converting daycase to IPD:', error);
        res.status(500).json({
          message: 'Error converting daycase to IPD',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // DISCHARGE ROUTES
  // ============================================

  // DISCHARGE FROM ENCOUNTER (IPD or Daycase)
  dischargeEncounter = [
    body('dischargeStatus').optional().isIn(['home', 'transfer', 'expired', 'against_medical_advice']),
    body('dischargeDate').optional().isISO8601(),
    body('dischargeSummary').optional().isString(),

    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
          res.status(401).json({ message: 'User authentication required' });
          return;
        }

        const result = await this.service.dischargeFromEncounter(id, req.body, user.id);

        res.json({
          success: true,
          message: result.message,
          dischargeDate: result.dischargeDate
        });
      } catch (error) {
        console.error('Error discharging patient:', error);
        res.status(500).json({
          message: 'Error discharging patient',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // BED OCCUPANCY
  // ============================================

  // GET BED OCCUPANCY (All IPD + Daycase)
  getBedOccupancy = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const occupants = await this.service.getBedOccupancy();

      res.json({
        success: true,
        data: occupants.data,
        summary: occupants.summary
      });
    } catch (error) {
      console.error('Error fetching bed occupancy:', error);
      res.status(500).json({
        message: 'Error fetching bed occupancy',
        error: (error as Error).message
      });
    }
  };
}