// modules/auth/AuthRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from './AuthController';

export function createAuthRoutes(prisma: PrismaClient): Router {
  console.log('🔥 createAuthRoutes called');
  const controller = new AuthController(prisma);
  const router = controller.getRouter();
  console.log('🔥 Router returned from controller');
  return router;
}