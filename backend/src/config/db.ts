// config/db.ts
// Kept for backwards compatibility: re-exports the single shared Prisma client.
// (Previously this created its own client and logged every query.)
import prisma from '../core/database/prisma.client';

export default prisma;
