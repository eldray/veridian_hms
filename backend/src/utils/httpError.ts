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
  /** Field-level reasons, forwarded to the client so a form can name what is missing. */
  details?: HttpFieldDetail[];
}

export interface HttpFieldDetail {
  field?: string;
  message?: string;
  code?: string;
}

const isHttpStatus = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 400 && (v as number) < 600;

/** Last meaningful line of a (very long) Prisma validation message, e.g. "Argument `address` is missing." */
const lastLine = (message: string): string => {
  const lines = String(message).split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] || 'Invalid data';
};

/** "birthWeight" -> "Birth weight", so a Prisma column name reads as a form label. */
const humanFieldName = (raw: string): string => {
  const words = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  if (!words) return raw;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

/**
 * Prisma says "Argument `birthWeight` must not be null." or "Argument `address` is missing.".
 * A clinician cannot act on that, and it leaks a column name, so reword it as the field being
 * required and keep the field in `details` for the form to highlight.
 */
const prismaFieldProblem = (message: string): HttpError | null => {
  const match = message.match(/Argument\s+`?([A-Za-z0-9_.]+)`?\s+(must not be null|is missing)/i);
  if (!match) return null;
  const field = match[1].split('.').pop() || match[1];
  const label = humanFieldName(field);
  return { status: 400, message: `${label} is required`, details: [{ field, message: `${label} is required`, code: 'REQUIRED' }] };
};

/**
 * A ValidationError header like "Validation failed" tells a clinician nothing, but the field
 * reasons sit beside it in `details`. Fold them into the message so every client that reads the
 * message - which is most of them - gets the reason, not just the ones that read `details`.
 */
const isGenericHeader = (message: string): boolean =>
  /^(validation failed|validation error|invalid [\w ]*|error|bad request)$/i.test(message.trim()) || message.trim() === '';

export const withReasons = (message: string, details?: HttpFieldDetail[]): string => {
  const reasons = fieldReasons(details);
  if (reasons.length === 0) return message;
  if (isGenericHeader(message)) return reasons.join('; ');
  const extra = reasons.filter((r) => !message.includes(r));
  return extra.length > 0 ? `${message} — ${extra.join('; ')}` : message;
};

const fieldReasons = (details?: HttpFieldDetail[] | null): string[] =>
  Array.from(new Set((details || [])
    .map((d) => String(d?.message || '').trim())
    .filter(Boolean)));

/** express-validator's own text when a check was written without `.withMessage()`. */
const isUnwrittenMessage = (message: string): boolean =>
  /^(invalid value|invalid param|invalid body|invalid query)$/i.test(message.trim());

const wasLeftBlank = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

/**
 * Accepts every field-error shape the API emits and returns one the desk can act on.
 *
 * Controllers hand over either hand-built `{ field, message }` items or express-validator's raw
 * `{ msg, path, value }` items. A check written without `.withMessage()` reports only "Invalid
 * value", which names neither the box on the form nor the mistake, so build the wording from the
 * field label and the value that was actually submitted: a blank value means the box was skipped.
 */
export function toFieldDetails(errors?: any[] | null): HttpFieldDetail[] {
  if (!Array.isArray(errors)) return [];
  return errors.reduce<HttpFieldDetail[]>((acc, entry) => {
    if (!entry || typeof entry !== 'object') {
      const bare = String(entry ?? '').trim();
      if (bare) acc.push({ message: bare });
      return acc;
    }
    const field = String(entry.field ?? entry.path ?? entry.param ?? '').trim() || undefined;
    const raw = String(entry.message ?? entry.msg ?? '').trim();
    const label = field ? humanFieldName(field) : '';
    const message = raw && !isUnwrittenMessage(raw)
      ? raw
      : label
        ? `${label} ${wasLeftBlank(entry.value) ? 'is required' : 'is not a valid value'}`
        : 'One of the fields is not filled in correctly';
    acc.push({ ...(field ? { field } : {}), message, ...(entry.code ? { code: entry.code } : {}) });
    return acc;
  }, []);
}

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
    const line = lastLine(err.message);
    return prismaFieldProblem(line) || { status: 400, message: line };
  }

  // body-parser: malformed JSON
  if (err?.type === 'entity.parse.failed') return { status: 400, message: 'Request body is not valid JSON' };

  const status = [err?.statusCode, err?.status].find(isHttpStatus) ?? 500;
  const message = err?.message || 'Internal server error';
  // ValidationError carries field-level reasons; without them the form can only say "Save failed".
  const details = toFieldDetails(err?.details);

  // Never show internals (SQL, file paths) for unexpected server errors in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    return { status, message: 'Internal server error' };
  }
  return { status, message: withReasons(message, details), ...(details.length > 0 ? { details } : {}) };
}
