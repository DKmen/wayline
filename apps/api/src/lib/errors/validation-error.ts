import type { ZodError } from 'zod';
import { ApiError } from './api-error';

/** 400 — request shape rejected by a Zod schema; carries flattened issues for the client. */
export class ValidationError extends ApiError {
  readonly issues: { path: string; message: string }[];

  constructor(zodError: ZodError) {
    super(400, 'validation_failed', 'request validation failed');
    this.issues = zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
}
