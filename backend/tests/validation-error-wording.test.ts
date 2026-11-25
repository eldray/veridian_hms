import { describe, expect, it, vi } from 'vitest';
import { body } from 'express-validator';
import { validate } from '../src/utils/helpers';
import { createErrorResponse } from '../src/shared/types/ApiResponse';
import { toHttpError } from '../src/utils/httpError';
import { ValidationError } from '../src/utils/errors';

// A clerk who presses Save with the surname left blank must read "Surname is required", not
// "Validation failed" or "Request failed with status code 400". These are the words every screen
// shows, so they are asserted here rather than in a browser.

const runValidation = async (chains: any[], body: unknown) => {
  const req: any = { body, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' }, path: '/api/test', method: 'POST' };
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  await validate(chains)(req, res, next);
  return { res, next, payload: res.json.mock.calls[0]?.[0] };
};

describe('express-validator rejections name the field', () => {
  it('names the box a check was written for', async () => {
    const { next, payload } = await runValidation(
      [body('surname').notEmpty().withMessage('Surname is required')],
      { surname: '' },
    );

    expect(next).not.toHaveBeenCalled();
    expect(payload.message).toBe('Surname is required');
    expect(payload.errors).toEqual([{ field: 'surname', message: 'Surname is required' }]);
  });

  it('turns an unwritten check on a blank input into "X is required"', async () => {
    // Gravida has no .withMessage(), so express-validator only says "Invalid value" - which field
    // it refers to has to come from the path, and "required" from the fact that nothing was sent.
    const { payload } = await runValidation([body('gravida').isInt({ min: 1 })], {});

    expect(payload.errors).toEqual([{ field: 'gravida', message: 'Gravida is required' }]);
    expect(payload.message).toBe('Gravida is required');
  });

  it('says "not a valid value" when the box was filled in wrongly', async () => {
    const { payload } = await runValidation([body('para').isInt()], { para: 'many' });

    expect(payload.errors).toEqual([{ field: 'para', message: 'Para is not a valid value' }]);
  });

  it('lists every missing input instead of only the first', async () => {
    const { payload } = await runValidation(
      [
        body('patientId').notEmpty().withMessage('Patient ID required'),
        body('lmp').isISO8601().withMessage('Valid LMP date required'),
      ],
      { patientId: '', lmp: 'not-a-date' },
    );

    expect(payload.message).toBe('Patient ID required; Valid LMP date required');
  });

  it('keeps a descriptive header and still appends the reason', async () => {
    const body = createErrorResponse('Cannot close this booking', [{ field: 'deliveryDate', message: 'Confirmed pregnancy outcome date is required' }], 400);

    expect(body.message).toBe('Cannot close this booking — Confirmed pregnancy outcome date is required');
  });

  it('answers a response with no message at all with the field reason', () => {
    // Department/Settings/Scan-template controllers historically sent { errors } only, so the
    // client had no `message` to show.
    const body = createErrorResponse('' as any, [{ type: 'field', path: 'name', value: '', msg: 'Invalid value' }] as any, 400);

    expect(body.message).toBe('Name is required');
    expect(body.errors).toEqual([{ field: 'name', message: 'Name is required' }]);
  });
});

describe('thrown validation errors reach the client with their reasons', () => {
  it('folds field details into the message', () => {
    const err = new ValidationError('Validation failed', [
      { field: 'surname', message: 'Surname is required' },
      { field: 'gender', message: 'Gender is required' },
    ]);

    expect(toHttpError(err)).toMatchObject({
      status: 400,
      message: 'Surname is required; Gender is required',
      details: [
        { field: 'surname', message: 'Surname is required' },
        { field: 'gender', message: 'Gender is required' },
      ],
    });
  });

  it('translates a Prisma "argument is missing" into the form label', () => {
    const err = Object.assign(new Error('Invalid `prisma.encounter.update()` invocation:\n\nArgument `birthWeight` must not be null.'), {
      name: 'PrismaClientValidationError',
    });

    expect(toHttpError(err)).toMatchObject({ status: 400, message: 'Birth weight is required' });
  });
});
