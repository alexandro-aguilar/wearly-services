import awsLambdaFastify from '@fastify/aws-lambda';
import { buildPlatformApp } from '@src/shared/presentation/http/buildPlatformApp';

const app = buildPlatformApp();

export const handler = awsLambdaFastify(app);
