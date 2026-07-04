export type PlatformErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export type PlatformErrorDetails = Record<string, unknown>[];

export class PlatformError extends Error {
  constructor(
    readonly code: PlatformErrorCode,
    message: string,
    readonly statusCode: number,
    readonly details: PlatformErrorDetails = []
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class ValidationError extends PlatformError {
  constructor(message = 'Request validation failed.', details: PlatformErrorDetails = []) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthenticatedError extends PlatformError {
  constructor(message = 'Missing or invalid credentials.') {
    super('UNAUTHENTICATED', message, 401);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends PlatformError {
  constructor(message = 'Authenticated user is not authorized for this operation.') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends PlatformError {
  constructor(message = 'Resource was not found.') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends PlatformError {
  constructor(message = 'Resource conflict.') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}
