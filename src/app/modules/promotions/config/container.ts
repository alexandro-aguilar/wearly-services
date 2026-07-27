import { Container } from 'inversify';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { CryptoIdGenerator } from '@src/app/core/utils/CryptoIdGenerator';
import { CreatePromotionHandler } from '@src/app/modules/promotions/application/commands/CreatePromotionHandler';
import { UpdatePromotionHandler } from '@src/app/modules/promotions/application/commands/UpdatePromotionHandler';
import { DeactivatePromotionHandler } from '@src/app/modules/promotions/application/commands/DeactivatePromotionHandler';
import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import {
  PromotionAuthorizationPolicy,
  PromotionClock,
  PromotionIdGenerator,
} from '@src/app/modules/promotions/application/ports/PromotionServices';
import { RoleBasedPromotionAuthorizationPolicy } from '@src/app/modules/promotions/application/PromotionAuthorizationPolicy';
import { EvaluatePromotionsHandler } from '@src/app/modules/promotions/application/queries/EvaluatePromotionsHandler';
import { ListActivePromotionsHandler } from '@src/app/modules/promotions/application/queries/ListActivePromotionsHandler';
import { ListPromotionsHandler } from '@src/app/modules/promotions/application/queries/ListPromotionsHandler';
import types from '@src/app/modules/promotions/config/types';
import { InMemoryPromotionRepository } from '@src/app/modules/promotions/infrastructure/repositories/in-memory/InMemoryPromotionRepository';
import { DrizzlePromotionRepository } from '@src/app/modules/promotions/infrastructure/repositories/drizzle/DrizzlePromotionRepository';
import { SystemClock } from '@src/shared/application/Clock';

const container = new Container();
const useDrizzlePromotions = process.env.CHECKOUT_PERSISTENCE === 'drizzle';
container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
if (useDrizzlePromotions) {
  container.bind<PromotionRepository>(types.PromotionRepository).to(DrizzlePromotionRepository).inSingletonScope();
} else {
  container.bind<PromotionRepository>(types.PromotionRepository).to(InMemoryPromotionRepository).inSingletonScope();
}
container
  .bind<PromotionAuthorizationPolicy>(types.PromotionAuthorizationPolicy)
  .to(RoleBasedPromotionAuthorizationPolicy)
  .inSingletonScope();
container.bind<PromotionClock>(types.PromotionClock).to(SystemClock).inSingletonScope();
container.bind<PromotionIdGenerator>(types.PromotionIdGenerator).to(CryptoIdGenerator).inSingletonScope();
container
  .bind<CreatePromotionHandler>(types.CreatePromotionHandler)
  .toDynamicValue(
    (context) =>
      new CreatePromotionHandler(
        context.get<PromotionRepository>(types.PromotionRepository),
        context.get<PromotionAuthorizationPolicy>(types.PromotionAuthorizationPolicy),
        context.get<PromotionIdGenerator>(types.PromotionIdGenerator)
      )
  );
container
  .bind<UpdatePromotionHandler>(types.UpdatePromotionHandler)
  .toDynamicValue(
    (context) =>
      new UpdatePromotionHandler(
        context.get<PromotionRepository>(types.PromotionRepository),
        context.get<PromotionAuthorizationPolicy>(types.PromotionAuthorizationPolicy)
      )
  );
container
  .bind<DeactivatePromotionHandler>(types.DeactivatePromotionHandler)
  .toDynamicValue(
    (context) =>
      new DeactivatePromotionHandler(
        context.get<PromotionRepository>(types.PromotionRepository),
        context.get<PromotionAuthorizationPolicy>(types.PromotionAuthorizationPolicy)
      )
  );
container
  .bind<ListPromotionsHandler>(types.ListPromotionsHandler)
  .toDynamicValue(
    (context) =>
      new ListPromotionsHandler(
        context.get<PromotionRepository>(types.PromotionRepository),
        context.get<PromotionAuthorizationPolicy>(types.PromotionAuthorizationPolicy)
      )
  );
container
  .bind<ListActivePromotionsHandler>(types.ListActivePromotionsHandler)
  .toDynamicValue(
    (context) =>
      new ListActivePromotionsHandler(
        context.get<PromotionRepository>(types.PromotionRepository),
        context.get<PromotionAuthorizationPolicy>(types.PromotionAuthorizationPolicy),
        context.get<PromotionClock>(types.PromotionClock)
      )
  );
container
  .bind<EvaluatePromotionsHandler>(types.EvaluatePromotionsHandler)
  .toDynamicValue(
    (context) => new EvaluatePromotionsHandler(context.get<PromotionRepository>(types.PromotionRepository))
  );

export default container;
