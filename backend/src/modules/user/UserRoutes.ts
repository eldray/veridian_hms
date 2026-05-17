/**
 * User Routes
 * Express router configuration for user management endpoints
 */

import { Router } from 'express';
import { UserController } from './UserController';
import { protect } from '../../middleware/authMiddleware';

export class UserRoutes {
  private router: Router;
  private controller: UserController;

  constructor(controller: UserController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes (no authentication required)
    this.router.post('/register', this.controller.register);
    this.router.post('/login', this.controller.login);
    this.router.post('/refresh-token', this.controller.refreshToken);

    // Protected routes (authentication required)
    this.router.post('/change-password', protect, this.controller.changePassword);
    this.router.get('/me', protect, this.controller.getProfile);
    this.router.put('/me', protect, this.controller.updateProfile);

    // Admin-only routes (you may want to add role checking middleware as well)
    this.router.get('/', protect, this.controller.getAllUsers);
    this.router.get('/statistics', protect, this.controller.getStatistics);
    this.router.post('/:id/suspend', protect, this.controller.suspendUser);
    this.router.post('/:id/activate', protect, this.controller.activateUser);
    this.router.delete('/:id', protect, this.controller.deleteUser);
  }

  getRouter(): Router {
    return this.router;
  }
}