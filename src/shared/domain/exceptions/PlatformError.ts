export type PlatformErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STALE_PRICING'
  | 'INSUFFICIENT_STOCK'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR';

export interface PlatformErrorDetail {
  readonly field?: string;
  readonly message: string;
}

export class PlatformError extends Error {
  constructor(
    readonly code: PlatformErrorCode,
    message: string,
    readonly details: readonly PlatformErrorDetail[] = []
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends PlatformError {
  constructor(message: string = 'Request validation failed.', details: readonly PlatformErrorDetail[] = []) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class UnauthenticatedError extends PlatformError {
  constructor(message: string = 'Authentication is required.') {
    super('UNAUTHENTICATED', message);
  }
}

export class ForbiddenError extends PlatformError {
  constructor(message: string = 'You are not allowed to perform this action.') {
    super('FORBIDDEN', message);
  }
}

export class NotFoundError extends PlatformError {
  constructor(message: string = 'Resource was not found.') {
    super('NOT_FOUND', message);
  }
}

export class ConflictError extends PlatformError {
  constructor(message: string = 'Resource already exists.') {
    super('CONFLICT', message);
  }
}

export class StalePricingError extends PlatformError {
  constructor(message: string = 'Checkout pricing is no longer current.') {
    super('STALE_PRICING', message);
  }
}

export class InsufficientStockError extends PlatformError {
  constructor(message: string = 'Insufficient stock is available to complete this sale.') {
    super('INSUFFICIENT_STOCK', message);
  }
}

export class IdempotencyConflictError extends PlatformError {
  constructor(message: string = 'This idempotency key was already used with different input.') {
    super('IDEMPOTENCY_CONFLICT', message);
  }
}

export class InternalError extends PlatformError {
  constructor(message: string = 'An unexpected error occurred.') {
    super('INTERNAL_ERROR', message);
  }
}
