import { describe, expect, it } from 'vitest';
import { responseHandler } from '@src/app/core/middleware/responseHandler';
import { ConflictError, ForbiddenError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

describe('responseHandler', () => {
  it.each([
    [new ValidationError('Invalid product.'), 400, 'VALIDATION_ERROR'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new ConflictError('SKU already exists in this store.'), 409, 'CONFLICT'],
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
