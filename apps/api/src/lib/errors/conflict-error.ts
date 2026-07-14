import { ApiError } from './api-error';

/** 409 — uniqueness conflict, e.g. a taken workspace slug. */
export class ConflictError extends ApiError {
  constructor(message = 'conflict') {
    super(409, 'conflict', message);
  }
}
