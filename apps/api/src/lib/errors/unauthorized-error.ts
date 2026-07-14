import { ApiError } from './api-error';

/** 401 — no session or an expired one. */
export class UnauthorizedError extends ApiError {
  constructor(message = 'authentication required') {
    super(401, 'unauthorized', message);
  }
}
