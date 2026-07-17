import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiErrorHandler } from './error-handler';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';

function buildThrowingApp(error: Error) {
  const app = new Hono();
  app.onError(apiErrorHandler);
  app.get('/boom', () => {
    throw error;
  });
  return app;
}

describe('apiErrorHandler', () => {
  it.each([
    [new UnauthorizedError(), 401, 'unauthorized'],
    [new ForbiddenError(), 403, 'forbidden'],
    [new NotFoundError(), 404, 'not_found'],
    [new ConflictError(), 409, 'conflict'],
  ] as const)('maps %s to its status and code', async (error, status, code) => {
    const res = await buildThrowingApp(error).request('/boom');

    expect(res.status).toBe(status);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe(code);
  });

  it('maps ValidationError to 400 with flattened issues', async () => {
    const zodError = z.object({ slug: z.string().min(2) }).safeParse({ slug: 'x' });
    if (zodError.success) throw new Error('expected parse failure');

    const res = await buildThrowingApp(new ValidationError(zodError.error)).request('/boom');

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; issues: { path: string; message: string }[] };
    };
    expect(body.error.code).toBe('validation_failed');
    expect(body.error.issues[0]!.path).toBe('slug');
  });

  it('maps an unknown error to an opaque 500 with no message or stack leaked', async () => {
    const res = await buildThrowingApp(new Error('secret database password')).request('/boom');

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('secret database password');
    expect(text).not.toContain('at ');
    expect(JSON.parse(text)).toEqual({ error: { code: 'internal', message: 'internal error' } });
  });
});
