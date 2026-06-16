export default interface ILogger {
  info(message: string, obj?: Record<string, unknown>): void;
  debug(message: string, obj?: Record<string, unknown>): void;
  error(message: string, obj?: Record<string, unknown>): void;
  warn(message: string, obj?: Record<string, unknown>): void;
  addContext(context: Record<string, unknown>): void;
}
