import { injectable } from 'inversify';
import { LogLevel, Logger as PowertoolsLogger } from '@aws-lambda-powertools/logger';
import ILogger from './ILogger';
import Environment from './Environment';

@injectable()
export default class PowertoolsLoggerAdapter implements ILogger {
  private readonly logger: PowertoolsLogger;

  constructor() {
    this.logger = new PowertoolsLogger({
      serviceName: Environment.POWERTOOLS_SERVICE_NAME,
      logLevel: LogLevel[(Environment.POWERTOOLS_LOG_LEVEL as keyof typeof LogLevel) ?? 'INFO'],
    });
  }

  info(message: string, obj?: Record<string, unknown>) {
    if (obj) {
      this.logger.info(message, JSON.stringify(obj));
    } else {
      this.logger.info(message);
    }
  }

  debug(message: string, obj?: Record<string, unknown>) {
    if (obj) {
      this.logger.debug(message, JSON.stringify(obj));
    } else {
      this.logger.debug(message);
    }
  }

  error(message: string, obj?: Record<string, unknown>) {
    if (obj) {
      this.logger.error(message, JSON.stringify(obj));
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string, obj?: Record<string, unknown>) {
    if (obj) {
      this.logger.warn(message, JSON.stringify(obj));
    } else {
      this.logger.warn(message);
    }
  }

  addContext(context: Record<string, unknown>) {
    this.logger.appendPersistentKeys(context);
  }
}
