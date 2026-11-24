import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { passwordPolicyError } from '../src/utils/passwordPolicy';
import { AuthService } from '../src/modules/auth/AuthService';
import { UserService } from '../src/modules/user/UserService';

describe('password policy', () => {
  it('requires at least twelve characters', () => {
    expect(passwordPolicyError('short-pass')).toMatch(/at least 12/);
    expect(passwordPolicyError('twelve-chars!')).toBeNull();
  });

  it('rejects whitespace-only passwords', () => {
    expect(passwordPolicyError('            ')).toMatch(/whitespace/);
  });

  it('rejects passwords that bcrypt would silently truncate', () => {
    expect(passwordPolicyError('A'.repeat(73))).toMatch(/72 bytes/);
    expect(passwordPolicyError('A'.repeat(72))).toBeNull();
  });

  it('rejects the username and email addresses as passwords', () => {
    expect(passwordPolicyError('HospitalAdmin', { username: 'hospitaladmin' })).toMatch(/username/);
    expect(passwordPolicyError('someone@example.com', { email: 'Someone@Example.com' })).toMatch(/email/);
  });

  it('rejects known common and predictable facility passwords', () => {
    for (const password of [
      'password1234', 'password@1234', 'admin@123456', 'welcome123456',
      'hospital@123', 'ghana@123456', 'veridian12345', 'superadmin123',
    ]) {
      expect(passwordPolicyError(password), password).toMatch(/too common/);
    }
  });
});

describe('password changes enforce the policy', () => {
  const currentPassword = 'Current-Password-1';

  const buildService = async () => {
    const prisma = {
      user: { update: vi.fn().mockResolvedValue(undefined) },
      refreshToken: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      $transaction: vi.fn(async (work: any) => work({
        user: prisma.user,
        refreshToken: prisma.refreshToken,
      })),
    };
    const service = new AuthService(prisma as any);
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        username: 'eldray',
        email: 'eldray@example.com',
        password: await bcrypt.hash(currentPassword, 4),
      }),
    };
    (service as any).repository = repository;
    return { service, repository, prisma };
  };

  it('rejects a short new password without changing the account', async () => {
    const { service, repository, prisma } = await buildService();

    const result = await service.changePassword('user-1', {
      currentPassword,
      newPassword: 'short',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/at least 12/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    const { service, prisma } = await buildService();

    const result = await service.changePassword('user-1', {
      currentPassword,
      newPassword: currentPassword,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/different/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('stores a strong password and revokes the other sessions', async () => {
    const { service, prisma } = await buildService();

    const result = await service.changePassword('user-1', {
      currentPassword,
      newPassword: 'Ward-Round-2026!',
    });

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ version: { increment: 1 } }),
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });
});

describe('account creation enforces the policy', () => {
  it('rejects a short initial password before writing the user', async () => {
    const service = new UserService({} as any);
    const repository = {
      usernameExists: vi.fn().mockResolvedValue(false),
      findByEmail: vi.fn(),
      createUser: vi.fn(),
    };
    (service as any).repository = repository;
    (service as any).auditLogger = { log: vi.fn() };

    await expect(
      service.createUser(
        {
          username: 'new.records',
          password: 'short',
          fullName: 'New Records Officer',
          role: 'records',
        },
        { userId: 'admin-1', role: 'admin' },
      ),
    ).rejects.toThrow(/at least 12/);

    expect(repository.createUser).not.toHaveBeenCalled();
  });
});

describe('administrator password reset', () => {
  const buildService = (role = 'nurse') => {
    const prisma: any = {
      user: {
        update: vi.fn().mockResolvedValue({
          id: 'user-9', username: 'ward.nurse', fullName: 'Ward Nurse',
          email: 'ward.nurse@example.com', phone: null, imageUrl: null,
          licenseNumber: null, specialization: null, role, seniority: 'JUNIOR',
          isActive: true, departmentId: null, version: 1,
          department: null, headedDepartment: null,
          createdAt: new Date(), updatedAt: new Date(),
        }),
      },
      passwordResetRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      refreshToken: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction = vi.fn(async (work: any) => work({
      user: prisma.user,
      passwordResetRequest: prisma.passwordResetRequest,
      refreshToken: prisma.refreshToken,
    }));
    const service = new UserService(prisma as any);
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-9',
        username: 'ward.nurse',
        email: 'ward.nurse@example.com',
        role,
        isActive: true,
      }),
      update: vi.fn().mockImplementation(async (_id: string, data: any) => ({
        id: 'user-9',
        username: 'ward.nurse',
        role,
        isActive: true,
        ...data,
      })),
    };
    (service as any).repository = repository;
    (service as any).auditLogger = { log: vi.fn() };
    return { service, repository, prisma };
  };

  it('refuses a weak password and writes nothing', async () => {
    const { service, repository, prisma } = buildService();

    await expect(
      service.resetUserPassword('user-9', 'weak', { userId: 'admin-1', role: 'admin' }),
    ).rejects.toThrow(/at least 12/);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores a hashed password, clears any reset token and revokes the sessions', async () => {
    const { service, repository, prisma } = buildService();

    await service.resetUserPassword('user-9', 'Ward-Round-2026!', {
      userId: 'admin-1',
      role: 'admin',
    });

    const updateArgs = prisma.user.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 'user-9' });
    const data = updateArgs.data;
    expect(data.password).not.toBe('Ward-Round-2026!');
    expect(await bcrypt.compare('Ward-Round-2026!', data.password)).toBe(true);
    expect(data.resetToken).toBeNull();
    expect(data.resetExpiry).toBeNull();
    expect(data.version).toEqual({ increment: 1 });
    expect(prisma.passwordResetRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-9', status: { in: ['pending', 'approved'] } },
      data: expect.objectContaining({ status: 'completed', reviewedById: 'admin-1', codeHash: null, expiresAt: null }),
    }));
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-9' } });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('audits the reset without recording the password', async () => {
    const { service, prisma } = buildService();
    const auditLogger = (service as any).auditLogger;

    await service.resetUserPassword('user-9', 'Ward-Round-2026!', {
      userId: 'admin-1',
      role: 'admin',
    });

    expect(auditLogger.log).toHaveBeenCalledOnce();
    const entry = auditLogger.log.mock.calls[0][0];
    expect(entry.performedById).toBe('admin-1');
    expect(entry.entityId).toBe('user-9');
    expect(JSON.stringify(entry)).not.toMatch(/Ward-Round|passwordHash|\$2[aby]\$/);
    expect(prisma.user.update).toHaveBeenCalledOnce();
  });

  it('will not let an admin hand out a super-admin password', async () => {
    const { service, prisma } = buildService('super_admin');

    await expect(
      service.resetUserPassword('user-9', 'Ward-Round-2026!', { userId: 'admin-1', role: 'admin' }),
    ).rejects.toThrow(/super admin/i);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('forgot password', () => {
  const buildService = (user: any) => {
    const service = new AuthService({} as any);
    const repository = {
      findByUsername: vi.fn().mockResolvedValue(user),
      updateUser: vi.fn().mockResolvedValue(undefined),
    };
    (service as any).repository = repository;
    (service as any).prisma = { passwordResetRequest: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'reset-1' }),
    } };
    return { service, repository };
  };

  it('does not store a credential it cannot deliver', async () => {
    const { service, repository } = buildService({ id: 'user-1', username: 'ward.nurse' });

    const result = await service.forgotPassword('ward.nurse');

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/administrator review/i);
  });

  it('answers the same way whether or not the account exists', async () => {
    const found = buildService({ id: 'user-1', username: 'ward.nurse' });
    const missing = buildService(null);

    const withUser = await found.service.forgotPassword('ward.nurse');
    const withoutUser = await missing.service.forgotPassword('nobody.here');

    expect(withoutUser).toEqual(withUser);
    expect(missing.repository.updateUser).not.toHaveBeenCalled();
  });
});


describe('refresh-token logout', () => {
  it('revokes the exact supplied refresh token without requiring an access token', async () => {
    const service = new AuthService({} as any);
    const repository = {
      deleteRefreshToken: vi.fn().mockResolvedValue(undefined),
      deleteRefreshTokenForUser: vi.fn().mockResolvedValue(undefined),
    };
    (service as any).repository = repository;

    const result = await service.logout('expired-access-session-refresh-token');

    expect(result).toEqual({ success: true });
    expect(repository.deleteRefreshToken).toHaveBeenCalledWith('expired-access-session-refresh-token');
    expect(repository.deleteRefreshTokenForUser).not.toHaveBeenCalled();
  });
});
