import fastify, { FastifyInstance } from 'fastify';
import { toApiErrorResponse } from '@src/shared/presentation/http/ApiErrorResponse';
import { getCorrelationId } from '@src/shared/presentation/http/RequestContext';
import { NotFoundError } from '@src/shared/domain/errors/PlatformError';

export function buildPlatformApp(): FastifyInstance {
  const app = fastify({
    logger: true,
    requestIdHeader: 'x-correlation-id',
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-correlation-id', getCorrelationId(request));
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        correlationId: getCorrelationId(request),
      },
      'Request failed'
    );

    const response = toApiErrorResponse(error);
    reply.status(response.statusCode).send(response.body);
  });

  app.setNotFoundHandler((request, reply) => {
    const response = toApiErrorResponse(new NotFoundError(`Route ${request.method} ${request.url} was not found.`));
    reply.status(response.statusCode).send(response.body);
  });

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'wearly-services',
  }));

  return app;
}
