import { ApiError } from './api-error';

/** 403 — authenticated but not allowed; also used for unknown workspaces to avoid an existence oracle. */
export class ForbiddenError extends ApiError {
  constructor(message = 'forbidden') {
    super(403, 'forbidden', message);
  }
}
