import { UserRole, Seniority } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        role: UserRole;
        seniority: Seniority;
        username: string;
        fullName: string;
        email?: string;
        permissions?: string[]; // For future Dynamic RBAC
      };
      currentVersion?: number; // Used for optimistic locking in services
    }
  }
}
export {};