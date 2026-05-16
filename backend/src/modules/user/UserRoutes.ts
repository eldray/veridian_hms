/**
 * User Routes
 * Express router configuration for user management endpoints
 */

import { Router } from 'express';
import { UserController } from './UserController';
import { authMiddleware } from '../../middleware/authMiddleware'; // Assuming middleware exists

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
    this.router.post('/change-password', authMiddleware, this.controller.changePassword);
    this.router.get('/me', authMiddleware, this.controller.getProfile);
    this.router.put('/me', authMiddleware, this.controller.updateProfile);

    // Admin-only routes
    this.router.get('/', authMiddleware, this.controller.getAllUsers);
    this.router.get('/statistics', authMiddleware, this.controller.getStatistics);
    this.router.post('/:id/suspend', authMiddleware, this.controller.suspendUser);
    this.router.post('/:id/activate', authMiddleware, this.controller.activateUser);
    this.router.delete('/:id', authMiddleware, this.controller.deleteUser);
  }

  getRouter(): Router {
    return this.router;
  }
}
