/**
 * Staff Routes
 * Express router configuration for staff management endpoints
 */

import { Router } from 'express';
import { StaffController } from './StaffController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export class StaffRoutes {
  private router: Router;
  private controller: StaffController;

  constructor(controller: StaffController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Protected routes (authentication required - staff and admin)
    this.router.get('/me', protect, this.controller.getMyProfile);
    this.router.get('/:id', protect, this.controller.getStaffById);
    this.router.get('/employee/:employeeId', protect, this.controller.getStaffByEmployeeId);
    this.router.put('/:id', protect, this.controller.updateStaff);
    this.router.post('/:id/activate', protect, this.controller.activateStaff);
    this.router.post('/:id/leave', protect, this.controller.putOnLeave);

    // Admin-only routes
    this.router.post('/', protect, requireRole(['admin']), this.controller.createStaff);
    this.router.get('/', protect, requireRole(['admin']), this.controller.getAllStaff);
    this.router.get('/statistics', protect, requireRole(['admin']), this.controller.getStatistics);
    this.router.post('/:id/terminate', protect, requireRole(['admin']), this.controller.terminateStaff);

    // Doctor-specific routes (accessible by admin and clinical staff)
    this.router.get('/doctors/available', protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), this.controller.getAvailableDoctors);
    this.router.get('/doctors/department/:departmentId', protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), this.controller.getDoctorsByDepartment);
  }

  getRouter(): Router {
    return this.router;
  }
}