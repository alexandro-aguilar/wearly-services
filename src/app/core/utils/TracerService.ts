import { injectable } from 'inversify';
import { Tracer } from '@aws-lambda-powertools/tracer';
import Environment from './Environment';

@injectable()
export default class TracerService {
  private _tracer: Tracer;

  constructor() {
    this._tracer = new Tracer({
      serviceName: Environment.POWERTOOLS_SERVICE_NAME,
    });
  }

  get tracer(): Tracer {
    return this._tracer;
  }
}
