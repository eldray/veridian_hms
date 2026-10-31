/**
 * Turns a failed API call into the reason a staff member can act on.
 *
 * Without this a rejected save reads "Save failed" or "Request failed with status code 400",
 * which tells the clinician nothing. The backend sends the concrete reason in `message` and,
 * for field validation, a `details` or `errors` array - so name that instead.
 */

/** Headers that carry no information about what the clerk actually did wrong. */
const GENERIC_HEADER = /^(validation failed|validation error|bad request|error|invalid (request|input|data)|request failed with status code \d+|internal server error)$/i;

/** "dateOfBirth" -> "Date of birth", so a payload key reads as the label on the form. */
const fieldLabel = (raw: string): string => {
  const words = String(raw).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  if (!words) return raw;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

/**
 * The reasons carried by a field-validation response.
 *
 * The API emits three shapes depending on which validator caught the input: `details` from the
 * global error handler, `errors` of `{ field, message }` from the zod/express-validator helpers,
 * and legacy `errors` of `{ path, msg }` straight from express-validator. An item with no wording
 * of its own is named by its field, because "Invalid value" alone never told anyone which box was
 * skipped.
 */
function collectReasons(data: any): string[] {
  const items = [
    ...(Array.isArray(data?.details) ? data.details : []),
    ...(Array.isArray(data?.errors) ? data.errors : []),
  ];
  const reasons = items
    .map((item: any) => {
      if (typeof item === 'string') return item.trim();
      const raw = String(item?.message ?? item?.msg ?? '').trim();
      if (!raw) return '';
      const field = String(item?.field ?? item?.path ?? item?.param ?? '').trim();
      if (/^invalid value$/i.test(raw) && field) {
        const leftBlank = item?.value === undefined || item?.value === null || item?.value === '';
        return `${fieldLabel(field)} ${leftBlank ? 'is required' : 'is not a valid value'}`;
      }
      return raw;
    })
    .filter((reason) => reason.length > 0 && !GENERIC_HEADER.test(reason));
  return Array.from(new Set(reasons));
}

/** Up to three reasons read as a sentence; a longer list is not readable in a toast. */
const asSentence = (reasons: string[]): string => {
  if (reasons.length === 0) return '';
  const shown = reasons.slice(0, 3).join('; ');
  return reasons.length > 3 ? `${shown} (+${reasons.length - 3} more)` : shown;
};

export function describeApiError(err: any, fallback = 'The change could not be saved.'): string {
  // The axios interceptor resolves the reason once; pages that call this on the same error get it.
  if (err?.friendlyMessage) return String(err.friendlyMessage);

  const data = err?.response?.data;
  const reasons = collectReasons(data);
  if (reasons.length > 0) return asSentence(reasons);

  const message = String(data?.message || err?.message || '').trim();
  if (message && !GENERIC_HEADER.test(message)) return message;
  if (message) {
    // A generic header with no reasons at least drops the status-code text, which is never useful.
    return /^request failed/i.test(message) ? fallback : message;
  }
  return fallback;
}

/**
 * Reads a failed download back into a message.
 *
 * File responses are requested as blobs, so the server's JSON error body arrives as binary and
 * `data.message` is undefined - a rejected print would otherwise always say the generic
 * fallback. Parse the blob before giving up.
 */
export async function describeBlobError(err: any, fallback = 'The document could not be downloaded.'): Promise<string> {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      const message = describeApiError({ response: { ...err?.response, data: parsed } }, '');
      if (message) return message;
    } catch {
      // A real binary payload (or an empty body) is not JSON, so there is no reason to name.
    }
    return fallback;
  }
  return describeApiError(err, fallback);
}

/** Toast title that matches the status, so a validation stop doesn't look like a crash. */
export function describeApiErrorTitle(err: any, fallback = 'Not saved'): string {
  const status = err?.response?.status;
  if (status === 400 || status === 422) return 'Check the form';
  if (status === 409) return 'Already recorded';
  if (status === 401 || status === 403) return 'Not allowed';
  if (status === 500) return 'Server error';
  if (!err?.response) return 'Offline';
  return fallback;
}

/**
 * Resolve the reason once, where the API call actually failed.
 *
 * Most screens toast `err.message`, which axios fills with "Request failed with status code 400",
 * so the clerk never learns that they left the surname blank. Replacing that text here fixes every
 * such toast at once, and the reason is kept in `friendlyMessage` for a screen that wants it
 * without re-reading the response body.
 *
 * Only real HTTP responses are touched: a cancelled request or a network failure keeps the message
 * axios generated, because screens test for those.
 */
export function annotateApiError(error: any): any {
  if (!error?.response) return error;
  const data = error.response.data;
  if (!data || typeof data !== 'object' || data instanceof Blob) return error;
  const reason = describeApiError(error, '');
  // Only axios's own transport wording is worth leaving alone; a server message such as "Internal
  // server error" still beats "Request failed with status code 500" on a toast.
  if (!reason || /^request failed with status code/i.test(reason)) return error;
  error.friendlyMessage = reason;
  error.message = reason;
  return error;
}
