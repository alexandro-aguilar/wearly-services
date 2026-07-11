import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import BadRequestException from '../domain/exceptions/BadRequestException';
import UnauthorizedException from '../domain/exceptions/UnauthorizerException';
import ForbiddenException from '../domain/exceptions/ForbiddenException';
import NotFoundException from '../domain/exceptions/NotFoundException';
import Exception from '../domain/exceptions/Exception';
import { MiddlewareObj } from '@middy/core';
import { PlatformError, PlatformErrorCode } from '@src/shared/domain/exceptions/PlatformError';

const headers = (request: { event: APIGatewayProxyEventV2 }) => {
  // verify if content types comes, if not, add it with application/json
  if (!request.event.headers || !request.event.headers['Content-Type']) {
    request.event.headers = {
      ...request.event.headers,
      'Content-Type': 'application/json',
    };
  }
  return Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(request.event.headers || {}).filter(([_, v]) => v !== undefined)
  ) as Record<string, string | number | boolean>;
};

const responseHandler = (): MiddlewareObj<APIGatewayProxyEventV2, APIGatewayProxyResult> => {
  return {
    after: (request) => {
      const { response } = request;
      console.log('Response body is an object:', response);
      if (!response) return;

      if (response.body && typeof response.body === 'object') {
        console.log('Response body is an object:', response.body);
        // Format the response
        response.body = JSON.stringify({
          body: response.body,
        });
        response.statusCode = response.statusCode || 200;
        response.headers = headers(request);
      }
    },
    onError: (request) => {
      const { error } = request;

      if (error instanceof PlatformError) {
        request.response = {
          statusCode: statusCodeForPlatformError(error.code),
          body: JSON.stringify({
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          }),
          headers: Object.fromEntries(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            Object.entries(request.event.headers || {}).filter(([_, v]) => v !== undefined)
          ) as Record<string, string | number | boolean>,
        };
        return;
      }

      // Using a switch statement to determine the status code
      let statusCode = 500;
      switch (true) {
        case error instanceof BadRequestException:
          statusCode = 400;
          break;
        case error instanceof UnauthorizedException:
          statusCode = 401;
          break;
        case error instanceof ForbiddenException:
          statusCode = 403;
          break;
        case error instanceof NotFoundException:
          statusCode = 404;
          break;
        case error instanceof Exception:
          statusCode = 500;
          break;
      }

      request.response = {
        statusCode,
        body: JSON.stringify({ data: error?.message }),
        headers: Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(request.event.headers || {}).filter(([_, v]) => v !== undefined)
        ) as Record<string, string | number | boolean>,
      };
    },
  };
};

function statusCodeForPlatformError(code: PlatformErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'UNAUTHENTICATED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'INTERNAL_ERROR':
      return 500;
  }
}

export { responseHandler };
