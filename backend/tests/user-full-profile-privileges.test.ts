// PATCH /users/:id/full-profile lets an "admin-like" actor (admin, super_admin AND hr_officer) edit a staff
// account. The controller passes req.body through, and the service used to copy every key of payload.user into a
// raw prisma.user.update. An HR officer could therefore change role / isActive / seniority / password, none of
// which HR may touch (the route comments say account edits "stay with the administrators").
//
// Rules now: privileges (role, seniority, isActive) are administrator-only and a real attempt is refused with 403;
// the staff screen re-sends the whole form, so an UNCHANGED privilege value is not an attempt; columns outside the
// allow-lists (password, tokens, ids) can never be written through this route by anyone.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => ({
  AuditAction: { update: 'update', create: 'create', delete: 'delete', login: 'login', logout: 'logout' },
  Prisma: {}, PrismaClient: class {},
}));

import { UserService } from '../src/modules/user/UserService';

const target = { id: 'target-1', role: 'doctor', fullName: 'Dr Target', seniority: 'JUNIOR', isActive: true, departmentId: null, username: 'dtarget' };
const HASH = '$2a$12$attackerChosenHashAttackerChosenHashAttackerChosenHashAtt';

function serviceWith(captured: any[], targetUser: any = target) {
  const svc: any = new UserService({} as any);
  svc.repository = {
    findFullProfile: async () => ({ ...targetUser, staffProfile: null }),
    findById: async () => targetUser,
    updateUserFields: async (_id: string, data: any) => { captured.push(data); return target; },
    updateStaffProfileFields: async () => ({}),
  };
  svc.auditLogger = { log: async () => {} };
  return svc;
}
const actor = (role: string, userId = 'actor-1') => ({ userId, role });
const written = (captured: any[]) => Object.assign({}, ...captured);

let captured: any[];
beforeEach(() => { captured = []; });

describe('updateFullProfile: privileges are administrator-only', () => {
  it.each([
    ['role', 'admin'],
    ['seniority', 'PRINCIPAL'],
    ['isActive', false],
  ])('an hr_officer who changes "%s" is refused with 403 and nothing is written', async (field, value) => {
    await expect(serviceWith(captured).updateFullProfile('target-1', { user: { fullName: 'New Name', [field]: value } }, actor('hr_officer')))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(captured).toEqual([]);                                     // not even the harmless fullName: all or nothing
  });

  it('a System Admin cannot edit another System Admin account through the full-profile route', async () => {
    const otherAdmin = { ...target, role: 'admin' };
    await expect(serviceWith(captured, otherAdmin).updateFullProfile(
      'target-1',
      { user: { fullName: 'Changed Admin' } },
      actor('admin', 'system-admin-1'),
    )).rejects.toMatchObject({ statusCode: 403 });
    expect(captured).toEqual([]);
  });

  it('an administrator cannot change their own role through the full-profile route', async () => {
    const selfAdmin = { ...target, role: 'admin' };
    await expect(serviceWith(captured, selfAdmin).updateFullProfile(
      'target-1',
      { user: { role: 'doctor' } },
      actor('admin', 'target-1'),
    )).rejects.toMatchObject({ statusCode: 403 });
    expect(captured).toEqual([]);
  });

  it('an hr_officer cannot promote THEMSELVES', async () => {
    await expect(serviceWith(captured).updateFullProfile('actor-1', { user: { role: 'admin' } }, actor('hr_officer', 'actor-1')))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(captured).toEqual([]);
  });

  it('the staff screen re-sends the whole form: UNCHANGED role, seniority and status are not an attempt', async () => {
    await serviceWith(captured).updateFullProfile('target-1',
      { user: { fullName: 'New Name', phone: '024', role: 'doctor', seniority: 'JUNIOR', isActive: true, licenseNumber: 'MDC/1', specialization: 'Surgery' } },
      actor('hr_officer'));
    expect(written(captured)).toMatchObject({ fullName: 'New Name', phone: '024', licenseNumber: 'MDC/1', specialization: 'Surgery' });
    for (const k of ['role', 'seniority', 'isActive']) expect(written(captured)).not.toHaveProperty(k);   // no-ops are skipped
  });

  it('an hr_officer may still maintain staff data (licence, specialization, department)', async () => {
    await serviceWith(captured).updateFullProfile('target-1', { user: { licenseNumber: 'MDC/2', specialization: 'ENT', departmentId: 'dept-1' } }, actor('hr_officer'));
    expect(written(captured)).toMatchObject({ licenseNumber: 'MDC/2', specialization: 'ENT', department: { connect: { id: 'dept-1' } } });
  });

  it('an ordinary user cannot give themselves a role', async () => {
    await expect(serviceWith(captured).updateFullProfile('target-1', { user: { fullName: 'Me', role: 'admin' } }, actor('doctor', 'target-1')))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(captured).toEqual([]);
  });

  it('a user who is neither the owner nor admin-like is refused with 403', async () => {
    await expect(serviceWith(captured).updateFullProfile('target-1', { user: { fullName: 'X' } }, actor('nurse', 'someone-else')))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('updateFullProfile: columns outside the allow-lists can never be written', () => {
  it.each(['password', 'resetToken', 'resetExpiry', 'createdAt', 'id', 'username'])('"%s" is ignored, for an hr_officer and for an admin', async (key) => {
    for (const who of ['hr_officer', 'admin']) {
      captured.length = 0;
      await serviceWith(captured).updateFullProfile('target-1', { user: { fullName: 'Same', [key]: key === 'createdAt' ? new Date(0) : HASH } }, actor(who));
      expect(written(captured)).not.toHaveProperty(key);
      expect(written(captured).fullName).toBe('Same');                // the legitimate part still goes through
    }
  });
});

describe('updateFullProfile: legitimate use keeps working', () => {
  it('an admin can change role, seniority and active status', async () => {
    await serviceWith(captured).updateFullProfile('target-1', { user: { role: 'nurse', seniority: 'SENIOR', isActive: false } }, actor('admin'));
    expect(written(captured)).toMatchObject({ role: 'nurse', seniority: 'SENIOR', isActive: false });
  });

  it('only a super_admin can make someone a super_admin', async () => {
    await serviceWith(captured).updateFullProfile('target-1', { user: { role: 'super_admin' } }, actor('admin'));
    expect(written(captured)).not.toHaveProperty('role');
    captured.length = 0;
    await serviceWith(captured).updateFullProfile('target-1', { user: { role: 'super_admin' } }, actor('super_admin'));
    expect(written(captured)).toMatchObject({ role: 'super_admin' });
  });

  it('a user can edit their own name, email, phone and image', async () => {
    await serviceWith(captured).updateFullProfile('target-1', { user: { fullName: 'Me', email: 'me@x.org', phone: '024', imageUrl: '/u/1.png' } }, actor('doctor', 'target-1'));
    expect(written(captured)).toMatchObject({ fullName: 'Me', email: 'me@x.org', phone: '024', imageUrl: '/u/1.png' });
  });
});
