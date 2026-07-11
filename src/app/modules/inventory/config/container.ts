import { Container } from 'inversify';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { CryptoIdGenerator } from '@src/app/core/utils/CryptoIdGenerator';
import ILogger from '@src/app/core/utils/ILogger';
import { SystemClock } from '@src/shared/application/Clock';
import {
  InMemoryCatalogStore,
  sharedInMemoryCatalogStore,
} from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';
import { InMemoryProductVariantRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductVariantRepository';
import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { RoleBasedInventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/InventoryAuthorizationPolicy';
import { AdjustInventoryHandler } from '@src/app/modules/inventory/application/commands/AdjustInventoryHandler';
import {
  InventoryMovementRepository,
  InventoryVariantStockGateway,
} from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import {
  InventoryAuthorizationPolicy,
  InventoryClock,
  InventoryIdGenerator,
} from '@src/app/modules/inventory/application/ports/InventoryServices';
import { GetInventoryAvailabilityHandler } from '@src/app/modules/inventory/application/queries/GetInventoryAvailabilityHandler';
import { ListInventoryMovementsHandler } from '@src/app/modules/inventory/application/queries/ListInventoryMovementsHandler';
import { ListLowStockVariantsHandler } from '@src/app/modules/inventory/application/queries/ListLowStockVariantsHandler';
import { InMemoryInventoryMovementRepository } from '@src/app/modules/inventory/infrastructure/repositories/in-memory/InMemoryInventoryMovementRepository';
import { InMemoryInventoryVariantStockGateway } from '@src/app/modules/inventory/infrastructure/repositories/in-memory/InMemoryInventoryVariantStockGateway';
import types from '@src/app/modules/inventory/config/types';

const container = new Container();

container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container
  .bind<InventoryAuthorizationPolicy>(types.InventoryAuthorizationPolicy)
  .to(RoleBasedInventoryAuthorizationPolicy)
  .inSingletonScope();
container.bind<InventoryClock>(types.InventoryClock).to(SystemClock).inSingletonScope();
container.bind<InventoryIdGenerator>(types.InventoryIdGenerator).to(CryptoIdGenerator).inSingletonScope();
container.bind<InMemoryCatalogStore>(types.InventoryCatalogStore).toConstantValue(sharedInMemoryCatalogStore);
container
  .bind<ProductVariantRepository>(types.InventoryProductVariantRepository)
  .toDynamicValue(
    (context) => new InMemoryProductVariantRepository(context.get<InMemoryCatalogStore>(types.InventoryCatalogStore))
  )
  .inSingletonScope();
container
  .bind<InventoryVariantStockGateway>(types.InventoryVariantStockGateway)
  .toDynamicValue(
    (context) =>
      new InMemoryInventoryVariantStockGateway(
        context.get<ProductVariantRepository>(types.InventoryProductVariantRepository)
      )
  )
  .inSingletonScope();
container
  .bind<InventoryMovementRepository>(types.InventoryMovementRepository)
  .to(InMemoryInventoryMovementRepository)
  .inSingletonScope();

container
  .bind<AdjustInventoryHandler>(types.AdjustInventoryHandler)
  .toDynamicValue(
    (context) =>
      new AdjustInventoryHandler(
        context.get<InventoryVariantStockGateway>(types.InventoryVariantStockGateway),
        context.get<InventoryMovementRepository>(types.InventoryMovementRepository),
        context.get<InventoryAuthorizationPolicy>(types.InventoryAuthorizationPolicy),
        context.get<InventoryClock>(types.InventoryClock),
        context.get<InventoryIdGenerator>(types.InventoryIdGenerator)
      )
  )
  .inSingletonScope();
container
  .bind<GetInventoryAvailabilityHandler>(types.GetInventoryAvailabilityHandler)
  .toDynamicValue(
    (context) =>
      new GetInventoryAvailabilityHandler(
        context.get<InventoryVariantStockGateway>(types.InventoryVariantStockGateway),
        context.get<InventoryAuthorizationPolicy>(types.InventoryAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<ListInventoryMovementsHandler>(types.ListInventoryMovementsHandler)
  .toDynamicValue(
    (context) =>
      new ListInventoryMovementsHandler(
        context.get<InventoryMovementRepository>(types.InventoryMovementRepository),
        context.get<InventoryAuthorizationPolicy>(types.InventoryAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<ListLowStockVariantsHandler>(types.ListLowStockVariantsHandler)
  .toDynamicValue(
    (context) =>
      new ListLowStockVariantsHandler(
        context.get<InventoryVariantStockGateway>(types.InventoryVariantStockGateway),
        context.get<InventoryAuthorizationPolicy>(types.InventoryAuthorizationPolicy)
      )
  )
  .inSingletonScope();

export default container;
