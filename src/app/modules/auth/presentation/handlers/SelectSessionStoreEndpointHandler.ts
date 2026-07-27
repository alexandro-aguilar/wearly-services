import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import Joi from '@hapi/joi';
import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import Authorization from '@src/app/core/interface/Authorization';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { responseHandler } from '@src/app/core/middleware/responseHandler';
import { SessionContextDto } from '@src/app/modules/auth/application/dtos/SessionContextDto';
import { SelectSessionStoreHandler } from '@src/app/modules/auth/application/queries/SessionContextHandlers';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import TracerService from '@src/app/core/utils/TracerService';
import container from '@src/app/modules/auth/config/container';
import types from '@src/app/modules/auth/config/types';
const schema: ValidatorSchemas = { body: Joi.object({ storeId: Joi.string().required() }).required() };
const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);
export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<SessionContextDto>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    return container.get<SelectSessionStoreHandler>(types.SelectSessionStoreHandler).execute(principal, body.storeId);
  }
)
  .use(requestValidator(schema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
