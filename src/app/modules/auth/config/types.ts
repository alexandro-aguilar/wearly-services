const types = {
  Logger: Symbol.for('AuthLogger'),
  MetricsService: Symbol.for('AuthMetricsService'),
  TracerService: Symbol.for('AuthTracerService'),
  SessionStoreRoleRepository: Symbol.for('SessionStoreRoleRepository'),
  GetSessionContextHandler: Symbol.for('GetSessionContextHandler'),
  SelectSessionStoreHandler: Symbol.for('SelectSessionStoreHandler'),
  ResolveSelectedStoreContext: Symbol.for('ResolveSelectedStoreContext'),
};

export default types;
