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
import { GetProductVariantByIdHandler } from '../../application/queries/GetProductVariantByIdHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';

const getProductVariantByIdEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({
    id: Joi.string().required(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ variant: ProductVariantSnapshot }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = new Authorization(event.headers['Authorization'] || '');
    const getProductVariantByIdHandler = container.get<GetProductVariantByIdHandler>(
      types.GetProductVariantByIdHandler
    );
    const response = await getProductVariantByIdHandler.execute(authenticatedPrincipal, event.pathParameters?.id || '');

    return {
      variant: response,
    };
  }
)
  .use(requestValidator(getProductVariantByIdEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
