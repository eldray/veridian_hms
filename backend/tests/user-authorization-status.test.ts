// A refusal must reach the client as 403 with its message. A plain `new Error(...)` becomes HTTP 500, and in
// production the message is replaced by "Internal server error", so "Only super admins can ..." looked like a crash.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => ({
  AuditAction: { update: 'update', create: 'create', delete: 'delete', login: 'login', logout: 'logout' },
  Prisma: {}, PrismaClient: class {},
}));

import { UserService } from '../src/modules/user/UserService';
import { toHttpError } from '../src/utils/httpError';

const superAdmin = { id: 'sa', role: 'super_admin', username: 'root', fullName: 'Root', seniority: 'PRINCIPAL', isActive: true };
const leaveOf = (userId: string, status = 'pending') => ({ id: 'leave-1', userId, status });

function svc(extra: Record<string, any> = {}) {
  const s: any = new UserService({} as any);
  s.repository = { findById: async () => superAdmin, findLeaveById: async () => leaveOf('owner-1'), ...extra };
  s.auditLogger = { log: async () => {} };
  return s;
}
const asAdmin = { userId: 'admin-1', role: 'admin' };
const refused = (p: Promise<unknown>) => p.then(() => { throw new Error('was not refused'); }, (e) => toHttpError(e));

describe('authorization refusals are 403s that keep their message', () => {
  it('an admin creating a super_admin', async () => {
    const r = await refused(svc().createUser({ username: 'x', password: 'long-enough-password', fullName: 'X', role: 'super_admin' } as any, asAdmin));
    expect(r).toMatchObject({ status: 403, message: 'Only Super Admin can create administrator accounts' });
  });

  it('an admin deactivating a super_admin', async () => {
    const r = await refused(svc().deactivateUser('sa', asAdmin));
    expect(r).toMatchObject({ status: 403, message: 'Only Super Admin can deactivate administrator accounts' });
  });

  it('a nurse approving a leave request', async () => {
    const r = await refused(svc().updateLeave('leave-1', { status: 'approved' } as any, { userId: 'nurse-1', role: 'nurse' }));
    expect(r).toMatchObject({ status: 403, message: /leave/i });
  });

  it("someone else cancelling another person's leave request", async () => {
    const r = await refused(svc().updateLeave('leave-1', { status: 'cancelled' } as any, { userId: 'other-1', role: 'nurse' }));
    expect(r).toMatchObject({ status: 403, message: /own/i });
  });

  it("someone else deleting another person's leave request", async () => {
    const r = await refused(svc().deleteLeave('leave-1', { userId: 'other-1', role: 'nurse' }));
    expect(r).toMatchObject({ status: 403, message: 'You can only delete your own leave requests' });
  });

  it('still shows the real message in production (a 403 is not masked like a 500)', async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const r = await refused(svc().deactivateUser('sa', asAdmin));
      expect(r.message).toBe('Only Super Admin can deactivate administrator accounts');
    } finally { process.env.NODE_ENV = before; }
  });
});
