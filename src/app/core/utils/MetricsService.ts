import { Metrics } from '@aws-lambda-powertools/metrics';
import { injectable } from 'inversify';
import Environment from './Environment';

@injectable()
export default class MetricsService {
  private _metrics: Metrics;

  constructor() {
    this._metrics = new Metrics({
      namespace: Environment.PROJECT_NAME,
      serviceName: Environment.POWERTOOLS_SERVICE_NAME,
      defaultDimensions: {
        environment: Environment.STAGE,
        service: Environment.POWERTOOLS_SERVICE_NAME,
        function_name: 'MetricsService',
      },
    });
  }

  get metrics(): Metrics {
    return this._metrics;
  }
}
