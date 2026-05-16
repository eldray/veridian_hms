/**
 * Authentication Module Routes
 * Centralized route registration for auth module
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from './AuthController';

export function createAuthRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new AuthController(prisma);
  return controller.getRouter();
}
