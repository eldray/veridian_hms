// src/seed/rbac.ts
// The single source of truth for the RBAC `Role` / `Permission` catalogue.
//
// Both seeds need it: coreSeed runs on installed (production) databases, testSeed on demo
// databases. Keeping the matrix here means an installed database and a demo database agree
// about which role holds which permission instead of drifting apart.
//
// `super_admin` is the system owner and holds every permission. `admin` deliberately lacks
// `users.manage`, so it cannot create or re-role accounts — the one thing that would let it
// promote itself above the super administrator.

import type { PrismaClient } from '@prisma/client';

export const PERMISSION_DEFINITIONS: Array<[string, string]> = [
  ['hr.view', 'View staff profiles and HR records'],
  ['hr.manage', 'Create and update staff profiles'],
  ['users.manage', 'Manage system users and roles'],
  ['reports.view', 'View operational reports'],
  ['clinical.nursing', 'Use nursing workflows'],
  ['clinical.antenatal', 'Use antenatal workflows'],
  ['inventory.manage', 'Manage inventory and stock'],
];

export const ROLE_DEFINITIONS: Array<{ name: string; description: string }> = [
  { name: 'super_admin', description: 'System owner; user and role administration' },
  { name: 'admin', description: 'Facility administrator; cannot manage system users and roles' },
  { name: 'hr_officer', description: 'Human resources and staff administration' },
  { name: 'nurse', description: 'Nursing clinical workflows' },
  { name: 'doctor', description: 'Medical clinical workflows' },
];

const ALL_PERMISSIONS = PERMISSION_DEFINITIONS.map(([name]) => name);
const WITHOUT_USERS_MANAGE = ALL_PERMISSIONS.filter(name => name !== 'users.manage');

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: WITHOUT_USERS_MANAGE,
  hr_officer: ['hr.view', 'hr.manage', 'reports.view'],
  nurse: ['clinical.nursing', 'clinical.antenatal'],
  doctor: ['reports.view', 'clinical.antenatal'],
};

/**
 * Upserts the permission and role catalogue, wires up role->permission grants, then attaches
 * the named RBAC role to each listed user. Idempotent, and never clears an existing grant.
 */
export const upsertRbac = async (
  prisma: PrismaClient,
  usernameToRole: Record<string, string> = {},
): Promise<Map<string, string>> => {
  const permissionIds = new Map<string, string>();
  for (const [name, description] of PERMISSION_DEFINITIONS) {
    const permission = await prisma.permission.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    permissionIds.set(name, permission.id);
  }

  const roleIds = new Map<string, string>();
  for (const definition of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: definition.name },
      update: { description: definition.description },
      create: { name: definition.name, description: definition.description },
    });
    roleIds.set(role.name, role.id);
  }

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleIds.get(roleName);
    if (!roleId) continue;
    for (const permissionName of permissionNames) {
      const permissionId = permissionIds.get(permissionName);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  for (const [username, roleName] of Object.entries(usernameToRole)) {
    const roleId = roleIds.get(roleName);
    if (!roleId) continue;
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) continue;
    // `set`, not `connect`: demo databases seeded before the `admin` role existed still
    // carry the super_admin grant on their admin accounts, and connecting alone would
    // leave that escalation in place forever.
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: [{ id: roleId }] } },
    });
  }

  return roleIds;
};

export default upsertRbac;
