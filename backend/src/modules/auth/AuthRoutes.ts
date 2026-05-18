/**
 * Authentication Module Routes
 * Centralized route registration for auth module
 */

// modules/auth/AuthRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from './AuthController';

export function createAuthRoutes(prisma: PrismaClient): Router {
  const controller = new AuthController(prisma);
  return controller.getRouter();
}