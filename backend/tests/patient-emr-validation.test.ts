import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validateBody } from '../src/middleware/validate';
import { createAllergySchema, createMedicalHistorySchema } from '../src/modules/patient/PatientSchemas';

const runMiddleware = (schema: z.ZodTypeAny, body: unknown) => {
  const req = { body } as any;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
  const next = vi.fn();
  validateBody(schema)(req, res, next);
  return { req, res, next };
};

describe('patient EMR request validation', () => {
  it('trims allergy input and drops unknown fields', () => {
    const { req, res, next } = runMiddleware(createAllergySchema, {
      allergen: '  Penicillin  ',
      reaction: ' Rash ',
      severity: 'severe',
      notes: '  Avoid all penicillins  ',
      patientId: 'someone-else',
    });

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toMatchObject({
      allergen: 'Penicillin',
      reaction: 'Rash',
      severity: 'severe',
      notes: 'Avoid all penicillins',
    });
    expect('patientId' in req.body).toBe(false);
  });

  it('rejects a whitespace-only allergen', () => {
    const { res, next } = runMiddleware(createAllergySchema, { allergen: '   ' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: [expect.objectContaining({ field: 'allergen' })],
      }),
    );
  });

  it('rejects an unknown severity instead of storing it', () => {
    const { res, next } = runMiddleware(createAllergySchema, {
      allergen: 'Latex',
      severity: 'deadly',
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: 'severity' })] }),
    );
  });

  it('accepts null optional allergy fields', () => {
    const { req, next } = runMiddleware(createAllergySchema, {
      allergen: 'Peanuts',
      reaction: null,
      severity: null,
      notes: null,
    });

    expect(next).toHaveBeenCalledOnce();
    expect(req.body.allergen).toBe('Peanuts');
  });

  it('accepts a history entry with a valid date and rejects an invalid one', () => {
    const valid = runMiddleware(createMedicalHistorySchema, {
      condition: '  Asthma  ',
      diagnosedAt: '2024-03-01',
      notes: 'Well controlled',
    });
    expect(valid.next).toHaveBeenCalledOnce();
    expect(valid.req.body.condition).toBe('Asthma');

    const blank = runMiddleware(createMedicalHistorySchema, {
      condition: 'Asthma',
      diagnosedAt: '   ',
    });
    expect(blank.next).toHaveBeenCalledOnce();
    expect(blank.req.body.diagnosedAt).toBeNull();

    const invalid = runMiddleware(createMedicalHistorySchema, {
      condition: 'Asthma',
      diagnosedAt: 'not-a-date',
    });
    expect(invalid.next).not.toHaveBeenCalled();
    expect(invalid.res.status).toHaveBeenCalledWith(400);
    expect(invalid.res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: 'diagnosedAt' })] }),
    );
  });

  it('rejects a history entry without a condition', () => {
    const { res, next } = runMiddleware(createMedicalHistorySchema, { notes: 'No condition' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: 'condition' })] }),
    );
  });

  it('rejects a missing body', () => {
    const { res, next } = runMiddleware(createAllergySchema, undefined);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: '(body)' })] }),
    );
  });
});
