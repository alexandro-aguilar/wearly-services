import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import Joi from '@hapi/joi';
import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Authorization from '@src/app/core/interface/Authorization';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { responseHandler } from '@src/app/core/middleware/responseHandler';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';
import { SessionContextDto, SessionRole } from '@src/app/modules/auth/application/dtos/SessionContextDto';
import MetricsService from '@src/app/core/utils/MetricsService';
import TracerService from '@src/app/core/utils/TracerService';
import container from '@src/app/modules/sales/config/container';
import types from '@src/app/modules/sales/config/types';
const schema: ValidatorSchemas = { body: Joi.object({ storeId: Joi.string().required() }).required() };
const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
export const handler = middy(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<SessionContextDto>> => {
    const principal = await Authorization.authenticate(event.headers);
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (body.storeId !== principal.storeId) throw new ForbiddenError('You do not have an active role in this store.');
    const role = principal.roles[0] as SessionRole;
    const store = { id: principal.storeId, name: principal.storeId, role };
    return {
      user: { id: principal.subjectId },
      role,
      store,
      currency: 'MXN',
      timeZone: 'America/Merida',
      availableStores: [store],
    };
  }
)
  .use(requestValidator(schema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
