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
    body('encounterType').isIn([
      'emergency_acute', 'antenatal', 'postnatal', 'chronic_followup',
      'specialist_consultation', 'delivery', 'surgery'
    ]).withMessage('Valid encounter type is required'),
    body('paymentMode').isIn(['cash', 'nhis', 'private_insurance', 'corporate'])
      .withMessage('Valid payment mode is required'),
    body('nhisCCC').optional().custom((value, { req }) => {
      if (req.body.paymentMode === 'nhis') {
        if (!value || !/^\d{5}$/.test(value)) {
          throw new Error('NHIS CCC number must be exactly 5 digits');
        }
      }
      return true;
    }),
    body('corporateAccountId').optional().custom((value, { req }) => {
      if (req.body.paymentMode === 'corporate') {
        if (!value) {
          throw new Error('Corporate Account ID is required for corporate payment mode');
        }
      }
      return true;
    }),

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
          message: 'Encounter created successfully'
        });
      } catch (error) {
        console.error('Error creating encounter:', error);
        res.status(500).json({
          message: 'Error creating encounter',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // GET ALL ENCOUNTERS
  // ============================================
  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        patientId: req.query.patientId as string,
        encounterType: req.query.encounterType as string,
        status: req.query.status as any,
        paymentMode: req.query.paymentMode as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50
      };

      const result = await this.service.getEncounters(filters);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching encounters:', error);
      res.status(500).json({
        message: 'Error fetching encounters',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET ENCOUNTER BY ID
  // ============================================
  getById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const encounter = await this.service.getEncounterById(id);

      res.json({
        success: true,
        data: encounter
      });
    } catch (error) {
      console.error('Error fetching encounter:', error);
      res.status(404).json({
        message: 'Encounter not found',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // UPDATE ENCOUNTER STATUS
  // ============================================
  updateStatus = [
    body('status').isIn(['pending', 'admitted', 'completed', 'discharged'])
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
          message: `Encounter status updated to ${status}`
        });
      } catch (error) {
        console.error('Error updating encounter status:', error);
        res.status(500).json({
          message: 'Error updating encounter status',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // ADD DIAGNOSIS
  // ============================================
  addDiagnosis = [
    body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
    body('diagnosisType').optional().isIn(['primary', 'additional', 'provisional'])
      .withMessage('Valid diagnosis type required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { diagnosisId, diagnosisType = 'provisional', notes } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const diagnosis = await this.service.addDiagnosis(id, {
          diagnosisId,
          diagnosisType: diagnosisType as any,
          notes
        }, user.id);

        res.json({
          success: true,
          data: diagnosis,
          message: 'Diagnosis added successfully'
        });
      } catch (error) {
        console.error('Error adding diagnosis:', error);
        res.status(500).json({
          message: 'Error adding diagnosis',
          error: (error as Error).message
        });
      }
    }
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
          message: 'Primary diagnosis set successfully'
        });
      } catch (error) {
        console.error('Error setting primary diagnosis:', error);
        res.status(500).json({
          message: 'Error setting primary diagnosis',
          error: (error as Error).message
        });
      }
    }
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
        message: 'Diagnosis removed successfully'
      });
    } catch (error) {
      console.error('Error removing diagnosis:', error);
      res.status(500).json({
        message: 'Error removing diagnosis',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // ADD VITALS
  // ============================================
  addVitals = [
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const {
          temperature, bloodPressureSystolic, bloodPressureDiastolic,
          pulse, respiratoryRate, oxygenSaturation, weight, height, muac, notes
        } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const vitals = await this.service.addVitals(id, {
          temperature, bloodPressureSystolic, bloodPressureDiastolic,
          pulse, respiratoryRate, oxygenSaturation, weight, height, muac, notes
        }, user.id);

        res.json({
          success: true,
          data: vitals,
          message: 'Vitals recorded successfully'
        });
      } catch (error) {
        console.error('Error adding vitals:', error);
        res.status(500).json({
          message: 'Error adding vitals',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // UPDATE VITALS
  // ============================================
  updateVitals = [
    async (req: AuthRequest, res: Response) => {
      try {
        const { vitalsId } = req.params;
        const updates = req.body;

        const vitals = await this.service.updateVitals(vitalsId, updates);

        res.json({
          success: true,
          data: vitals,
          message: 'Vitals updated successfully'
        });
      } catch (error) {
        console.error('Error updating vitals:', error);
        res.status(500).json({
          message: 'Error updating vitals',
          error: (error as Error).message
        });
      }
    }
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
        message: 'Vitals deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting vitals:', error);
      res.status(500).json({
        message: 'Error deleting vitals',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // ADD PRESCRIPTION
  // ============================================
  addPrescription = [
    body('stockItemId').notEmpty().withMessage('Stock item ID is required'),
    body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
    body('dosage').notEmpty().withMessage('Dosage is required'),
    body('frequency').notEmpty().withMessage('Frequency is required'),
    body('duration').notEmpty().withMessage('Duration is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { stockItemId, serviceCatalogId, dosage, frequency, duration, route, instructions } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const prescription = await this.service.addPrescription(id, {
          stockItemId, serviceCatalogId, dosage, frequency, duration, route, instructions
        }, user.id);

        res.json({
          success: true,
          data: prescription,
          message: 'Prescription added successfully'
        });
      } catch (error) {
        console.error('Error adding prescription:', error);
        res.status(500).json({
          message: 'Error adding prescription',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // DISPENSE MEDICATION
  // ============================================
  dispenseMedication = [
    body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
    body('batchNumber').optional().isString(),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { encounterId, medicationId } = req.params;
        const { quantity, batchNumber } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const medication = await this.service.dispenseMedication(
          encounterId,
          medicationId,
          quantity,
          user.id,
          batchNumber
        );

        res.json({
          success: true,
          data: medication,
          message: 'Medication dispensed successfully'
        });
      } catch (error) {
        console.error('Error dispensing medication:', error);
        res.status(500).json({
          message: 'Error dispensing medication',
          error: (error as Error).message
        });
      }
    }
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
        message: 'Medication removed successfully'
      });
    } catch (error) {
      console.error('Error removing medication:', error);
      res.status(500).json({
        message: 'Error removing medication',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // ADD LAB ORDER
  // ============================================
  addLabOrder = [
    body('testId').notEmpty().withMessage('Test ID is required'),
    body('priority').optional().isIn(['routine', 'urgent', 'stat'])
      .withMessage('Valid priority is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { testId, priority = 'routine', clinicalNotes } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: 'User authentication required' });
        }

        const labOrder = await this.service.addLabOrder(id, {
          testId, priority: priority as any, clinicalNotes
        }, user.id);

        res.json({
          success: true,
          data: labOrder,
          message: 'Lab order added successfully'
        });
      } catch (error) {
        console.error('Error adding lab order:', error);
        res.status(500).json({
          message: 'Error adding lab order',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // UPDATE LAB ORDER STATUS
  // ============================================
  updateLabOrderStatus = [
    body('status').isIn(['pending', 'collected', 'processing', 'completed', 'verified', 'cancelled'])
      .withMessage('Valid status is required'),

    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { labOrderId } = req.params;
        const { status, results } = req.body;
        const user = req.user;

        const labOrder = await this.service.updateLabOrderStatus(
          labOrderId,
          status,
          results,
          user?.id
        );

        res.json({
          success: true,
          data: labOrder,
          message: 'Lab order status updated successfully'
        });
      } catch (error) {
        console.error('Error updating lab order status:', error);
        res.status(500).json({
          message: 'Error updating lab order status',
          error: (error as Error).message
        });
      }
    }
  ];

  // ============================================
  // REMOVE LAB ORDER
  // ============================================
  removeLabOrder = async (req: AuthRequest, res: Response) => {
    try {
      const { encounterId, labOrderId } = req.params;

      await this.service.removeLabOrder(encounterId, labOrderId);

      res.json({
        success: true,
        message: 'Lab order removed successfully'
      });
    } catch (error) {
      console.error('Error removing lab order:', error);
      res.status(500).json({
        message: 'Error removing lab order',
        error: (error as Error).message
      });
    }
  };

  // ============================================
  // GET WORKLISTS (CLINICAL QUEUES)
  // ============================================
  getVitalsWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getVitalsWorklist();

      res.json({
        success: true,
        data: worklist,
        count: worklist.length
      });
    } catch (error) {
      console.error('Error fetching vitals worklist:', error);
      res.status(500).json({
        message: 'Error fetching vitals worklist',
        error: (error as Error).message
      });
    }
  };

  getMedicalWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getMedicalWorklist();

      res.json({
        success: true,
        data: worklist,
        count: worklist.length
      });
    } catch (error) {
      console.error('Error fetching medical worklist:', error);
      res.status(500).json({
        message: 'Error fetching medical worklist',
        error: (error as Error).message
      });
    }
  };

  getLabWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getLabWorklist();

      res.json({
        success: true,
        data: worklist,
        count: worklist.length
      });
    } catch (error) {
      console.error('Error fetching lab worklist:', error);
      res.status(500).json({
        message: 'Error fetching lab worklist',
        error: (error as Error).message
      });
    }
  };

  getPharmacyWorklist = async (req: AuthRequest, res: Response) => {
    try {
      const worklist = await this.service.getPharmacyWorklist();

      res.json({
        success: true,
        data: worklist,
        count: worklist.length
      });
    } catch (error) {
      console.error('Error fetching pharmacy worklist:', error);
      res.status(500).json({
        message: 'Error fetching pharmacy worklist',
        error: (error as Error).message
      });
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
        message: 'Encounter deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting encounter:', error);
      res.status(500).json({
        message: 'Error deleting encounter',
        error: (error as Error).message
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
        dateTo ? new Date(dateTo as string) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching encounter statistics:', error);
      res.status(500).json({
        message: 'Error fetching encounter statistics',
        error: (error as Error).message
      });
    }
  };
}
