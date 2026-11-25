import { describe, expect, it } from 'vitest';
import { PERMISSION_DEFINITIONS, ROLE_DEFINITIONS, ROLE_PERMISSION_MAP } from '../src/seed/rbac';

describe('facility RBAC catalogue', () => {
  const roleNames = ROLE_DEFINITIONS.map(role => role.name);
  const permissionNames = new Set(PERMISSION_DEFINITIONS.map(([name]) => name));

  it('defines permissions for every application role', () => {
    expect(roleNames.sort()).toEqual([
      'accounts', 'admin', 'doctor', 'hr_officer', 'lab_tech',
      'midwife', 'nurse', 'pharmacist', 'records', 'sonographer', 'super_admin',
    ].sort());
    expect(Object.keys(ROLE_PERMISSION_MAP).sort()).toEqual([...roleNames].sort());
  });

  it('references only permissions in the catalogue', () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const permission of permissions) {
        expect(permissionNames.has(permission), `${role} references unknown permission ${permission}`).toBe(true);
      }
    }
  });

  it('gives System Admin all facility permissions but not platform controls', () => {
    expect(ROLE_PERMISSION_MAP.admin).toContain('users.manage');
    expect(ROLE_PERMISSION_MAP.admin).toContain('billing.manage');
    expect(ROLE_PERMISSION_MAP.admin).toContain('clinical.consultation');
    expect(ROLE_PERMISSION_MAP.admin).not.toContain('platform.manage');
  });

  it('reserves platform controls for Super Admin', () => {
    expect(ROLE_PERMISSION_MAP.super_admin).toContain('platform.manage');
    for (const role of roleNames.filter(name => name !== 'super_admin')) {
      expect(ROLE_PERMISSION_MAP[role]).not.toContain('platform.manage');
    }
  });

  it('keeps specialist permissions separated by operational responsibility', () => {
    expect(ROLE_PERMISSION_MAP.lab_tech).toContain('lab.manage');
    expect(ROLE_PERMISSION_MAP.lab_tech).not.toContain('payments.manage');
    expect(ROLE_PERMISSION_MAP.pharmacist).toContain('pharmacy.dispense');
    expect(ROLE_PERMISSION_MAP.pharmacist).not.toContain('payroll.manage');
    expect(ROLE_PERMISSION_MAP.accounts).toContain('payments.manage');
    expect(ROLE_PERMISSION_MAP.accounts).not.toContain('clinical.consultation');
    expect(ROLE_PERMISSION_MAP.records).toContain('patients.manage');
    expect(ROLE_PERMISSION_MAP.records).not.toContain('clinical.consultation');
  });
});
