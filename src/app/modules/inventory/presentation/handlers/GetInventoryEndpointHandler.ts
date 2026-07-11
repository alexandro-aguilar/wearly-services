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
import { GetInventoryAvailabilityHandler } from '../../application/queries/GetInventoryAvailabilityHandler';
import { ListLowStockVariantsHandler } from '../../application/queries/ListLowStockVariantsHandler';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

const getInventoryEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    productVariantId: Joi.string().optional(),
    lowStock: Joi.boolean().optional(),
  })
    .or('productVariantId', 'lowStock')
    .optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<unknown>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);

    if (event.queryStringParameters?.lowStock) {
      const listLowStockVariantsHandler = container.get<ListLowStockVariantsHandler>(types.ListLowStockVariantsHandler);
      const variants = await listLowStockVariantsHandler.execute(authenticatedPrincipal);

      return { variants };
    }

    const productVariantId = event.queryStringParameters?.productVariantId;
    if (!productVariantId) {
      throw new ValidationError('productVariantId is required unless lowStock is true.');
    }

    const getInventoryAvailabilityHandler = container.get<GetInventoryAvailabilityHandler>(
      types.GetInventoryAvailabilityHandler
    );
    const availability = await getInventoryAvailabilityHandler.execute(authenticatedPrincipal, { productVariantId });

    return { availability };
  }
)
  .use(requestValidator(getInventoryEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
