# Veridian HMS role and permission policy

This document records the facility role policy used by `backend/src/seed/rbac.ts`.
It separates page access from permission to perform sensitive actions.

## Privilege hierarchy

1. **Super Admin** — platform owner. Has all facility permissions plus `platform.manage`.
2. **System Admin** — full facility-page and ordinary operational access. Does not receive platform-owner controls.
3. **Department roles** — receive only the permissions needed for their normal work. Their access is further constrained by ownership, department and service-level rules where applicable.

## Role matrix

| Role | Main permissions |
|---|---|
| Super Admin | All facility permissions; platform controls |
| System Admin | All ordinary facility permissions; user administration; no platform controls |
| HR Officer | Staff records, staff directory, shifts, leave, payroll and reports |
| Doctor | Patient view, consultations, inpatient care, antenatal, lab/imaging workflows and reports |
| Nurse | Patient view, attendance support, nursing, antenatal, postnatal and inpatient workflows |
| Midwife | Patient view, attendance support, nursing, antenatal, postnatal, delivery and inpatient workflows |
| Records | Patient registration/demographics, attendance and reports |
| Lab Technician | Patient view and laboratory workflows |
| Pharmacist | Patient view, dispensing, pharmacy operations and inventory |
| Accounts | Staff directory summary, billing, payments, insurance claims, inventory view and reports |
| Sonographer | Patient view and imaging workflows |

## Permission families

- HR: `hr.view`, `hr.manage`
- User accounts: `users.view`, `users.manage`
- Workforce: `shifts.view`, `shifts.manage`, `leave.view`, `leave.manage`, `payroll.view`, `payroll.manage`
- Patient administration: `patients.view`, `patients.manage`, `attendance.manage`
- Clinical: `clinical.consultation`, `clinical.nursing`, `clinical.antenatal`, `clinical.postnatal`, `clinical.delivery`, `clinical.inpatient`
- Diagnostics: `lab.manage`, `imaging.manage`
- Pharmacy and stock: `pharmacy.dispense`, `pharmacy.manage`, `inventory.view`, `inventory.manage`
- Finance: `billing.view`, `billing.manage`, `payments.manage`, `insurance.manage`
- Reporting: `reports.view`
- Platform: `platform.manage` (Super Admin only)

## Enforcement rules

- Page visibility is not a substitute for API authorization. Backend routes must enforce their own role, permission, ownership and department rules.
- `requireRole` allows System Admin and Super Admin into ordinary role-gated facility areas. Platform-only routes must use `requireSuperAdmin`.
- `requirePermission` allows both administrators to inherit ordinary facility permissions, but `platform.*` permissions are Super Admin-only, even if a System Admin is accidentally assigned that permission.
- System Admin can administer ordinary facility accounts, but the user service must continue to prevent it from creating, promoting, modifying, deactivating or resetting Super Admin accounts.
- HR access to staff information does not grant platform account-control privileges.
- Clinical and operational role permissions do not replace professional scope, department scoping, patient ownership, approval workflow or audit requirements.

## Implementation status

The seeded RBAC catalogue now defines all eleven application roles and their permission grants. The seed synchronizes each existing user's RBAC role relation from the canonical `User.role` value, so the permissions are not limited to newly created demo users.

The permission catalogue is the foundation for action-level authorization. Existing routes still contain explicit `requireRole` and service-level checks; they should be migrated to named permissions in small, tested groups rather than replacing every route gate in one bulk change. This avoids accidentally broadening clinical, financial or HR access.
