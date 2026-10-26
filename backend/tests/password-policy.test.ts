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
