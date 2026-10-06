// backend/src/utils/httpError.ts
//
// One place that turns ANY thrown error into { status, message } for the API response.
//
// Why: AppError has `status` = 'fail' | 'error' (a STRING) and `statusCode` = 404 etc. (a number).
// The old global handler did `res.status(error.status || 500)`, which is `res.status('fail')`;
// Node rejects that, so every "not found", "validation failed" or "duplicate" came back as an
// HTML 500 page and the user only saw "Request failed with status code 500".

export interface HttpError {
  status: number;
  message: string;
}

const isHttpStatus = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 400 && (v as number) < 600;

/** Last meaningful line of a (very long) Prisma validation message, e.g. "Argument `address` is missing." */
const lastLine = (message: string): string => {
  const lines = String(message).split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] || 'Invalid data';
};

export function toHttpError(err: any): HttpError {
  // Prisma: known request errors
  if (err?.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'value';
    return { status: 409, message: `Duplicate entry: this ${target} already exists.` };
  }
  if (err?.code === 'P2025') return { status: 404, message: 'Record not found' };
  if (err?.code === 'P2003') {
    return { status: 409, message: 'This record is linked to other records, or refers to a record that does not exist.' };
  }

  // Prisma: wrong or missing field in a query/body
  if (err?.name === 'PrismaClientValidationError') {
    return { status: 400, message: lastLine(err.message) };
  }

  // body-parser: malformed JSON
  if (err?.type === 'entity.parse.failed') return { status: 400, message: 'Request body is not valid JSON' };

  const status = [err?.statusCode, err?.status].find(isHttpStatus) ?? 500;
  const message = err?.message || 'Internal server error';

  // Never show internals (SQL, file paths) for unexpected server errors in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    return { status, message: 'Internal server error' };
  }
  return { status, message };
}
