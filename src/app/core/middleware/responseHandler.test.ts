import { describe, expect, it } from 'vitest';
import { responseHandler } from '@src/app/core/middleware/responseHandler';
import {
  ConflictError,
  ForbiddenError,
  IdempotencyConflictError,
  InsufficientStockError,
  StalePricingError,
  ValidationError,
} from '@src/shared/domain/exceptions/PlatformError';

describe('responseHandler', () => {
  it('wraps a successful HTTP response body in the established success envelope', async () => {
    const middleware = responseHandler();
    const request: {
      event: { headers: Record<string, string> };
      response: { statusCode?: number; body: object; headers?: Record<string, string | number | boolean> };
    } = {
      event: { headers: { 'x-correlation-id': 'correlation-1' } },
      response: { body: { quoteId: 'quote_1' } },
    };

    await middleware.after?.(request as never);

    expect(request.response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ body: { quoteId: 'quote_1' } }),
      headers: { 'Content-Type': 'application/json', 'x-correlation-id': 'correlation-1' },
    });
  });

  it.each([
    [new ValidationError('Invalid product.'), 400, 'VALIDATION_ERROR'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new ConflictError('SKU already exists in this store.'), 409, 'CONFLICT'],
    [new StalePricingError(), 409, 'STALE_PRICING'],
    [new InsufficientStockError(), 409, 'INSUFFICIENT_STOCK'],
    [new IdempotencyConflictError(), 409, 'IDEMPOTENCY_CONFLICT'],
  ])('maps platform error %s to an API error response', async (error, statusCode, code) => {
    const middleware = responseHandler();
    const request: {
      event: { headers: Record<string, string> };
      error: Error;
      response?: {
        statusCode: number;
        body: string;
        headers: Record<string, string | number | boolean>;
      };
    } = {
      event: {
        headers: {
          'x-correlation-id': 'correlation-1',
        },
      },
      error,
    };

    await middleware.onError?.(request as never);

    expect(request.response).toBeDefined();
    expect(request).toMatchObject({
      response: {
        statusCode,
        headers: {
          'x-correlation-id': 'correlation-1',
        },
      },
    });
    expect(JSON.parse(request.response?.body ?? '{}')).toEqual({
      error: {
        code,
        message: error.message,
        details: error.details,
      },
    });
  });
});
