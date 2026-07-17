import { ApiError } from './api-error';

/** 404 — resource genuinely absent within a workspace the caller can see. */
export class NotFoundError extends ApiError {
  constructor(message = 'not found') {
    super(404, 'not_found', message);
  }
}
