// routes/waiverRoutes.ts
import express from 'express';
import {
  createWaiverRequest,
  getWaivers,
  getWaiverById,
  updateWaiverStatus,
  approveWaiver,
  rejectWaiver,
  getWaiversByBill,
  getWaiversByPatient,
  getWaiverStatistics,
  deleteWaiver
} from '../controllers/waiverController';
import { protect, requireAdmin, requireAccountsStaff } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// ==========================================
// WAIVER MANAGEMENT ROUTES
// ==========================================

// POST /api/waivers - Create a waiver request
router.post('/', requireAccountsStaff, createWaiverRequest);

// GET /api/waivers - Get all waivers with filters
router.get('/', requireAccountsStaff, getWaivers);

// GET /api/waivers/statistics - Get waiver statistics
router.get('/statistics', requireAccountsStaff, getWaiverStatistics);

// GET /api/waivers/bill/:billId - Get waivers by bill
router.get('/bill/:billId', requireAccountsStaff, getWaiversByBill);

// GET /api/waivers/patient/:patientId - Get waivers by patient
router.get('/patient/:patientId', requireAccountsStaff, getWaiversByPatient);

// GET /api/waivers/:id - Get waiver by ID
router.get('/:id', requireAccountsStaff, getWaiverById);

// PATCH /api/waivers/:id/status - Update waiver status
router.patch('/:id/status', requireAccountsStaff, updateWaiverStatus);

// POST /api/waivers/:id/approve - Approve waiver
router.post('/:id/approve', requireAdmin, approveWaiver);

// POST /api/waivers/:id/reject - Reject waiver
router.post('/:id/reject', requireAdmin, rejectWaiver);

// DELETE /api/waivers/:id - Delete waiver (only if pending)
router.delete('/:id', requireAdmin, deleteWaiver);

export default router;