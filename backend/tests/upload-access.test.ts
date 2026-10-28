import { describe, expect, it, vi } from 'vitest';
import { canAccessUpload } from '../src/services/uploadAccess';

const referenced = (value: unknown) => vi.fn().mockResolvedValue(value);

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    patient: { findFirst: referenced(null) },
    scan: { findFirst: referenced(null) },
    user: { findFirst: referenced(null) },
    document: { findFirst: referenced(null) },
    generatedDocument: { findFirst: referenced(null) },
    ...overrides,
  } as any;
}

describe('upload access for patient and scan images', () => {
  it('denies an orphaned patient image even to a doctor', async () => {
    const db = makeDb();

    await expect(
      canAccessUpload({ id: 'user-1', role: 'doctor' }, 'patients', 'patient_1_photo_1.png', db),
    ).resolves.toBe(false);
  });

  it('lets clinical staff open a patient image that is attached to a patient', async () => {
    const db = makeDb({ patient: { findFirst: referenced({ id: 'patient-1' }) } });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'nurse' }, 'patients', 'patient_1_photo_1.png', db),
    ).resolves.toBe(true);
  });

  it('denies patient images to finance and HR roles', async () => {
    const db = makeDb({ patient: { findFirst: referenced({ id: 'patient-1' }) } });

    for (const role of ['accounts', 'hr_officer']) {
      await expect(
        canAccessUpload({ id: 'user-1', role }, 'patients', 'patient_1_photo_1.png', db),
      ).resolves.toBe(false);
    }
  });

  it('allows admins to open referenced clinical images', async () => {
    const db = makeDb({ scan: { findFirst: referenced({ id: 'scan-1' }) } });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'admin' }, 'scans', 'scan_1_img_1.png', db),
    ).resolves.toBe(true);
  });

  it('denies scan images to accounts', async () => {
    const db = makeDb({ scan: { findFirst: referenced({ id: 'scan-1' }) } });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'accounts' }, 'scans', 'scan_1_img_1.png', db),
    ).resolves.toBe(false);
  });
});

describe('upload access for staff documents', () => {
  it('lets the owner open their own HR document', async () => {
    const db = makeDb({ document: { findFirst: referenced({ staff: { userId: 'user-1' } }) } });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'doctor' }, 'documents', 'doc_1_cv_1.pdf', db),
    ).resolves.toBe(true);
  });

  it('denies a colleague and allows HR', async () => {
    const db = makeDb({ document: { findFirst: referenced({ staff: { userId: 'user-2' } }) } });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'doctor' }, 'documents', 'doc_2_cv_1.pdf', db),
    ).resolves.toBe(false);
    await expect(
      canAccessUpload({ id: 'user-1', role: 'hr_officer' }, 'documents', 'doc_2_cv_1.pdf', db),
    ).resolves.toBe(true);
  });
});

describe('upload access for generated clinical documents', () => {
  it('lets the generating user reopen a document they produced', async () => {
    const db = makeDb({
      generatedDocument: {
        findFirst: referenced({ entityType: 'encounter', generatedById: 'user-1' }),
      },
    });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'lab_tech' }, 'documents', 'lab_result_1_1.pdf', db),
    ).resolves.toBe(true);
  });

  it('allows roles that work on the underlying record type', async () => {
    const db = makeDb({
      generatedDocument: { findFirst: referenced({ entityType: 'bill', generatedById: 'user-9' }) },
    });

    await expect(
      canAccessUpload({ id: 'user-1', role: 'accounts' }, 'documents', 'receipt_1_1.pdf', db),
    ).resolves.toBe(true);
    await expect(
      canAccessUpload({ id: 'user-1', role: 'nurse' }, 'documents', 'receipt_1_1.pdf', db),
    ).resolves.toBe(false);
  });

  it('denies documents that no record references', async () => {
    await expect(
      canAccessUpload({ id: 'user-1', role: 'doctor' }, 'documents', 'unknown_1_1.pdf', makeDb()),
    ).resolves.toBe(false);
  });
});

describe('upload access boundaries', () => {
  it('rejects unsupported categories', async () => {
    await expect(
      canAccessUpload({ id: 'user-1', role: 'admin' }, 'temp', 'dump.sql', makeDb()),
    ).resolves.toBe(false);
  });

  it('serves staff photos only while they belong to a user', async () => {
    const attached = makeDb({ user: { findFirst: referenced({ id: 'user-2' }) } });
    const orphaned = makeDb();

    await expect(
      canAccessUpload({ id: 'user-1', role: 'accounts' }, 'users', 'user_2_avatar_1.png', attached),
    ).resolves.toBe(true);
    await expect(
      canAccessUpload({ id: 'user-1', role: 'accounts' }, 'users', 'user_2_avatar_1.png', orphaned),
    ).resolves.toBe(false);
  });
});
