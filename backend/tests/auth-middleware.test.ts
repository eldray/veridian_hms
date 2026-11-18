import { describe, expect, it, vi } from 'vitest';
import { requireRole, requireSuperAdmin } from '../src/middleware/authMiddleware';

describe('role authorization', () => {
  it('allows super_admin to inherit ordinary roles regardless of role casing', () => {
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    requireRole(['admin'])({ user: { role: 'SUPER_ADMIN' } }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('compares ordinary role names without case sensitivity', () => {
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    requireRole(['pharmacist'])({ user: { role: 'PHARMACIST' } }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects users whose role is not allowed', () => {
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    requireRole(['admin'])({ user: { role: 'nurse' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows System Admin to access every role-gated area', () => {
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    requireRole(['pharmacist'])({ user: { role: 'ADMIN' } }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('reserves Super Admin-only operations from System Admin', () => {
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    requireSuperAdmin({ user: { role: 'admin' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Super Admin access required' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows Super Admin through Super Admin-only operations', () => {
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    requireSuperAdmin({ user: { role: 'SUPER_ADMIN' } }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
