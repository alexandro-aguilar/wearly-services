import { responseHandler } from '@src/app/core/middleware/responseHandler';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import container from '../../config/container';
import TracerService from '@src/app/core/utils/TracerService';
import types from '../../config/types';
import MetricsService from '@src/app/core/utils/MetricsService';
import ILogger from '@src/app/core/utils/ILogger';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { ListInventoryMovementsHandler } from '../../application/queries/ListInventoryMovementsHandler';
import { InventoryMovementSnapshot } from '../../domain/InventoryMovement';

const listInventoryMovementsEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    productVariantId: Joi.string().optional(),
  }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ movements: InventoryMovementSnapshot[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);
    const listInventoryMovementsHandler = container.get<ListInventoryMovementsHandler>(
      types.ListInventoryMovementsHandler
    );
    const movements = await listInventoryMovementsHandler.execute(authenticatedPrincipal, {
      productVariantId: event.queryStringParameters?.productVariantId,
    });

    return { movements };
  }
)
  .use(requestValidator(listInventoryMovementsEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
