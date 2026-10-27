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

  it('rejects known common passwords', () => {
    expect(passwordPolicyError('password1234')).toMatch(/too common/);
  });
});

describe('password changes enforce the policy', () => {
  const currentPassword = 'Current-Password-1';

  const buildService = async () => {
    const service = new AuthService({} as any);
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        username: 'eldray',
        email: 'eldray@example.com',
        password: await bcrypt.hash(currentPassword, 4),
      }),
      updateUser: vi.fn().mockResolvedValue(undefined),
      deleteRefreshTokenForUser: vi.fn().mockResolvedValue(undefined),
    };
    (service as any).repository = repository;
    return { service, repository };
  };

  it('rejects a short new password without changing the account', async () => {
    const { service, repository } = await buildService();

    const result = await service.changePassword('user-1', {
      currentPassword,
      newPassword: 'short',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/at least 12/);
    expect(repository.updateUser).not.toHaveBeenCalled();
    expect(repository.deleteRefreshTokenForUser).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    const { service, repository } = await buildService();

    const result = await service.changePassword('user-1', {
      currentPassword,
      newPassword: currentPassword,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/different/);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it('stores a strong password and revokes the other sessions', async () => {
    const { service, repository } = await buildService();

    const result = await service.changePassword('user-1', {
      currentPassword,
      newPassword: 'Ward-Round-2026!',
    });

    expect(result.success).toBe(true);
    expect(repository.updateUser).toHaveBeenCalledOnce();
    expect(repository.deleteRefreshTokenForUser).toHaveBeenCalledWith('user-1');
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
    const service = new UserService({} as any);
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
      deleteAllRefreshTokens: vi.fn().mockResolvedValue(undefined),
    };
    (service as any).repository = repository;
    (service as any).auditLogger = { log: vi.fn() };
    return { service, repository };
  };

  it('refuses a weak password and writes nothing', async () => {
    const { service, repository } = buildService();

    await expect(
      service.resetUserPassword('user-9', 'weak', { userId: 'admin-1', role: 'admin' }),
    ).rejects.toThrow(/at least 12/);

    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.deleteAllRefreshTokens).not.toHaveBeenCalled();
  });

  it('stores a hashed password, clears any reset token and revokes the sessions', async () => {
    const { service, repository } = buildService();

    await service.resetUserPassword('user-9', 'Ward-Round-2026!', {
      userId: 'admin-1',
      role: 'admin',
    });

    const [userId, data] = repository.update.mock.calls[0];
    expect(userId).toBe('user-9');
    expect(data.password).not.toBe('Ward-Round-2026!');
    expect(await bcrypt.compare('Ward-Round-2026!', data.password)).toBe(true);
    expect(data.resetToken).toBeNull();
    expect(data.resetExpiry).toBeNull();
    expect(repository.deleteAllRefreshTokens).toHaveBeenCalledWith('user-9');
  });

  it('audits the reset without recording the password', async () => {
    const { service, repository } = buildService();
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
    expect(repository.update).toHaveBeenCalledOnce();
  });

  it('will not let an admin hand out a super-admin password', async () => {
    const { service, repository } = buildService('super_admin');

    await expect(
      service.resetUserPassword('user-9', 'Ward-Round-2026!', { userId: 'admin-1', role: 'admin' }),
    ).rejects.toThrow(/super admin/i);

    expect(repository.update).not.toHaveBeenCalled();
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
    return { service, repository };
  };

  it('does not store a credential it cannot deliver', async () => {
    const { service, repository } = buildService({ id: 'user-1', username: 'ward.nurse' });

    const result = await service.forgotPassword('ward.nurse');

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/administrator/);
    const [, data] = repository.updateUser.mock.calls[0];
    expect(data).toEqual({ resetToken: null, resetExpiry: null });
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
