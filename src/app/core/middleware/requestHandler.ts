import { MiddlewareObj } from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Metrics } from '@aws-lambda-powertools/metrics';

const requestHandler = (metrics: Metrics): MiddlewareObj<APIGatewayProxyEventV2, APIGatewayProxyResultV2> => {
  return {
    before: async (request) => {
      metrics.addMetadata('request_id', request.context.awsRequestId);

      try {
        if (request.event.body) {
          if (typeof request.event.body === 'string') {
            request.event.body = JSON.parse(request.event.body);
          }
        }
      } catch (error) {
        throw new Error(`Failed to parse JSON body: ${error}`);
      }
    },
  };
};

export { requestHandler };
