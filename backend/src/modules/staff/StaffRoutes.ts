/**
 * Staff Routes
 * Express router configuration for staff management endpoints
 */

import { Router } from 'express';
import { StaffController } from './StaffController';
import { authMiddleware } from '../../middleware/authMiddleware';

export class StaffRoutes {
  private router: Router;
  private controller: StaffController;

  constructor(controller: StaffController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Protected routes (authentication required)
    this.router.get('/me', authMiddleware, this.controller.getMyProfile);
    this.router.get('/:id', authMiddleware, this.controller.getStaffById);
    this.router.get('/employee/:employeeId', authMiddleware, this.controller.getStaffByEmployeeId);
    this.router.put('/:id', authMiddleware, this.controller.updateStaff);
    this.router.post('/:id/activate', authMiddleware, this.controller.activateStaff);
    this.router.post('/:id/leave', authMiddleware, this.controller.putOnLeave);

    // Admin-only routes
    this.router.post('/', authMiddleware, this.controller.createStaff);
    this.router.get('/', authMiddleware, this.controller.getAllStaff);
    this.router.get('/statistics', authMiddleware, this.controller.getStatistics);
    this.router.post('/:id/terminate', authMiddleware, this.controller.terminateStaff);

    // Doctor-specific routes
    this.router.get('/doctors/available', authMiddleware, this.controller.getAvailableDoctors);
    this.router.get('/doctors/department/:departmentId', authMiddleware, this.controller.getDoctorsByDepartment);
  }

  getRouter(): Router {
    return this.router;
  }
}
