import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  PlatformError,
  UnauthenticatedError,
  ValidationError,
} from '@src/shared/domain/exceptions/PlatformError';

describe('platform domain exceptions', () => {
  it.each([
    [new ValidationError('Invalid catalog data.'), 'VALIDATION_ERROR'],
    [new UnauthenticatedError(), 'UNAUTHENTICATED'],
    [new ForbiddenError(), 'FORBIDDEN'],
    [new NotFoundError(), 'NOT_FOUND'],
    [new ConflictError(), 'CONFLICT'],
    [new InternalError(), 'INTERNAL_ERROR'],
  ])('sets a stable error code for %s', (error, code) => {
    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.name).toBe(error.constructor.name);
  });

  it('preserves structured validation details', () => {
    const error = new ValidationError('Invalid product.', [{ field: 'name', message: 'Name is required.' }]);

    expect(error.details).toEqual([{ field: 'name', message: 'Name is required.' }]);
  });
});
