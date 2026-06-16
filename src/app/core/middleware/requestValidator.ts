import { MiddlewareObj } from '@middy/core';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { ObjectSchema } from '@hapi/joi';
import BadRequestException from '../domain/exceptions/BadRequestException';
import Exception from '../domain/exceptions/Exception';

export type ValidatorSchemas = {
  body?: ObjectSchema;
  pathParameters?: ObjectSchema;
  queryStringParameters?: ObjectSchema;
};

export function requestValidator(schemas?: ValidatorSchemas): MiddlewareObj<APIGatewayProxyEventV2, any> {
  return {
    before: async (request) => {
      const { event } = request;

      try {
        if (!schemas) {
          return;
        }
        if (schemas.body) {
          const parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
          const { value, error } = schemas.body.validate(parsedBody, { abortEarly: false });
          if (error) throw new BadRequestException(`Invalid request body: ${error.message}`);
          event.body = value;
        }

        if (schemas.pathParameters) {
          const { value, error } = schemas.pathParameters.validate(event.pathParameters || {}, { abortEarly: false });
          if (error) throw new BadRequestException(`Invalid path parameters ${error.message}`);
          event.pathParameters = value;
        }

        if (schemas.queryStringParameters) {
          const { value, error } = schemas.queryStringParameters.validate(event.queryStringParameters || {}, {
            abortEarly: false,
          });
          if (error) throw new BadRequestException(`Invalid query parameters: ${error.message}`);
          event.queryStringParameters = value;
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new Exception(`Unknown validation error: ${error}`);
      }
    },
  };
}
