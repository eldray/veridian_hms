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
  ['hr.manage', 'Create and update staff profiles and HR records'],
  ['users.view', 'View the staff directory and account summaries'],
  ['users.manage', 'Create and manage ordinary facility user accounts'],
  ['shifts.view', 'View staff rosters and shifts'],
  ['shifts.manage', 'Create and update staff shifts'],
  ['leave.view', 'View leave requests and balances'],
  ['leave.manage', 'Submit, review and administer leave requests'],
  ['payroll.view', 'View payroll and payslips'],
  ['payroll.manage', 'Prepare and administer payroll'],
  ['reports.view', 'View operational and departmental reports'],
  ['patients.view', 'View patient records needed for assigned work'],
  ['patients.manage', 'Register and update patient demographic records'],
  ['attendance.manage', 'Register and manage patient attendance'],
  ['clinical.consultation', 'Document and manage medical consultations'],
  ['clinical.nursing', 'Use nursing and vital-sign workflows'],
  ['clinical.antenatal', 'Use antenatal and maternal care workflows'],
  ['clinical.postnatal', 'Use postnatal care workflows'],
  ['clinical.delivery', 'Manage delivery and labour workflows'],
  ['clinical.inpatient', 'Manage inpatient and ward clinical workflows'],
  ['lab.manage', 'Manage laboratory requests and results'],
  ['imaging.manage', 'Manage imaging requests and scan results'],
  ['pharmacy.dispense', 'Dispense prescribed medicines'],
  ['pharmacy.manage', 'Manage pharmacy operations'],
  ['inventory.view', 'View stock and inventory records'],
  ['inventory.manage', 'Manage stock, requisitions and inventory adjustments'],
  ['billing.view', 'View bills and billing records'],
  ['billing.manage', 'Create and update bills and charges'],
  ['payments.manage', 'Collect, allocate and reconcile payments'],
  ['insurance.manage', 'Manage NHIS, corporate and private insurance claims'],
  ['platform.manage', 'Manage platform-level settings and destructive system controls'],
];

export const ROLE_DEFINITIONS: Array<{ name: string; description: string }> = [
  { name: 'super_admin', description: 'Platform owner; all facility and platform permissions, including privileged account and system controls' },
  { name: 'admin', description: 'System Admin; all ordinary facility pages and operational permissions, excluding platform-owner controls' },
  { name: 'hr_officer', description: 'Human resources, staff records, rosters, leave and payroll administration' },
  { name: 'doctor', description: 'Medical consultations, clinical orders and assigned patient care' },
  { name: 'nurse', description: 'Nursing, vital signs, attendance support and assigned patient care' },
  { name: 'midwife', description: 'Antenatal, postnatal, delivery and maternal clinical workflows' },
  { name: 'records', description: 'Patient registration, demographic records and attendance administration' },
  { name: 'lab_tech', description: 'Laboratory requests, processing and results' },
  { name: 'pharmacist', description: 'Pharmacy dispensing, pharmacy operations and stock management' },
  { name: 'accounts', description: 'Billing, payment collection, insurance claims and financial reporting' },
  { name: 'sonographer', description: 'Imaging requests, scan processing and imaging results' },
];

const ALL_PERMISSIONS = PERMISSION_DEFINITIONS.map(([name]) => name);
const FACILITY_PERMISSIONS = ALL_PERMISSIONS.filter(name => name !== 'platform.manage');

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: FACILITY_PERMISSIONS,
  hr_officer: [
    'hr.view', 'hr.manage', 'users.view',
    'shifts.view', 'shifts.manage', 'leave.view', 'leave.manage',
    'payroll.view', 'payroll.manage', 'reports.view',
  ],
  doctor: [
    'patients.view', 'clinical.consultation', 'clinical.inpatient',
    'clinical.antenatal', 'lab.manage', 'imaging.manage', 'reports.view',
  ],
  nurse: [
    'patients.view', 'attendance.manage', 'clinical.nursing',
    'clinical.antenatal', 'clinical.postnatal', 'clinical.inpatient',
  ],
  midwife: [
    'patients.view', 'attendance.manage', 'clinical.nursing',
    'clinical.antenatal', 'clinical.postnatal', 'clinical.delivery',
    'clinical.inpatient',
  ],
  records: [
    'patients.view', 'patients.manage', 'attendance.manage',
    'reports.view',
  ],
  lab_tech: ['patients.view', 'lab.manage'],
  pharmacist: [
    'patients.view', 'pharmacy.dispense', 'pharmacy.manage',
    'inventory.view', 'inventory.manage',
  ],
  accounts: [
    'users.view', 'billing.view', 'billing.manage', 'payments.manage',
    'insurance.manage', 'inventory.view', 'reports.view',
  ],
  sonographer: ['patients.view', 'imaging.manage'],
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
