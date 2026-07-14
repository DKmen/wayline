import type { Context } from 'hono';
import { ApiError, ValidationError } from './errors';
import { logSafe } from './logger';

/**
 * Maps typed ApiErrors to their JSON shape; anything unexpected becomes an opaque 500 —
 * never the raw message or stack (docs/09-security-privacy.md §2).
 */
export function apiErrorHandler(error: Error, c: Context) {
  if (error instanceof ApiError) {
    const body: { error: { code: string; message: string; issues?: unknown } } = {
      error: { code: error.code, message: error.message },
    };
    if (error instanceof ValidationError) body.error.issues = error.issues;
    return c.json(body, error.status);
  }

  logSafe('http.error', { route: c.req.path, method: c.req.method, statusCode: 500 });
  return c.json({ error: { code: 'internal', message: 'internal error' } }, 500);
}
