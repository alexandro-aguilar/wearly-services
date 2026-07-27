import { Container } from 'inversify';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import {
  GetSessionContextHandler,
  SelectSessionStoreHandler,
} from '@src/app/modules/auth/application/queries/SessionContextHandlers';
import { SessionStoreRoleRepository } from '@src/app/modules/auth/application/ports/SessionContextPorts';
import { ResolveSelectedStoreContext } from '@src/app/modules/auth/application/services/ResolveSelectedStoreContext';
import { DrizzleSessionStoreRoleRepository } from '@src/app/modules/auth/infrastructure/repositories/drizzle/DrizzleSessionStoreRoleRepository';
import types from '@src/app/modules/auth/config/types';

const container = new Container();

container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container
  .bind<SessionStoreRoleRepository>(types.SessionStoreRoleRepository)
  .to(DrizzleSessionStoreRoleRepository)
  .inSingletonScope();
container
  .bind<GetSessionContextHandler>(types.GetSessionContextHandler)
  .toDynamicValue(
    (context) => new GetSessionContextHandler(context.get<SessionStoreRoleRepository>(types.SessionStoreRoleRepository))
  )
  .inSingletonScope();
container
  .bind<SelectSessionStoreHandler>(types.SelectSessionStoreHandler)
  .toDynamicValue(
    (context) =>
      new SelectSessionStoreHandler(context.get<SessionStoreRoleRepository>(types.SessionStoreRoleRepository))
  )
  .inSingletonScope();
container
  .bind<ResolveSelectedStoreContext>(types.ResolveSelectedStoreContext)
  .toDynamicValue(
    (context) =>
      new ResolveSelectedStoreContext(context.get<SessionStoreRoleRepository>(types.SessionStoreRoleRepository))
  )
  .inSingletonScope();

export default container;
