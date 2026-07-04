import { PlatformError } from '@src/shared/domain/errors/PlatformError';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>[];
  };
}

export function toApiErrorResponse(error: unknown): { statusCode: number; body: ApiErrorResponse } {
  if (error instanceof PlatformError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected failure.',
        details: [],
      },
    },
  };
}
