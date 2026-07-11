import { Container } from 'inversify';
import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  InMemoryCatalogStore,
  sharedInMemoryCatalogStore,
} from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';
import { InMemoryProductVariantRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductVariantRepository';
import { InMemoryProductRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductRepository';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { CryptoIdGenerator } from '@src/app/core/utils/CryptoIdGenerator';
import {
  InventoryMovementRepository,
  InventoryVariantStockGateway,
} from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InMemoryInventoryMovementRepository } from '@src/app/modules/inventory/infrastructure/repositories/in-memory/InMemoryInventoryMovementRepository';
import { InMemoryInventoryVariantStockGateway } from '@src/app/modules/inventory/infrastructure/repositories/in-memory/InMemoryInventoryVariantStockGateway';
import { CompleteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteSaleHandler';
import {
  CheckoutTransactionManager,
  SaleRepository,
  SalesCatalogGateway,
  SalesCustomerGateway,
  SalesInventoryGateway,
  SalesPromotionGateway,
} from '@src/app/modules/sales/application/ports/SalesRepositories';
import {
  SalesAuthorizationPolicy,
  SalesClock,
  SalesIdGenerator,
} from '@src/app/modules/sales/application/ports/SalesServices';
import { GetSaleByIdHandler } from '@src/app/modules/sales/application/queries/GetSaleByIdHandler';
import { ListSalesHandler } from '@src/app/modules/sales/application/queries/ListSalesHandler';
import { RoleBasedSalesAuthorizationPolicy } from '@src/app/modules/sales/application/SalesAuthorizationPolicy';
import types from '@src/app/modules/sales/config/types';
import { InMemorySaleRepository } from '@src/app/modules/sales/infrastructure/repositories/in-memory/InMemorySaleRepository';
import { CatalogSalesGateway } from '@src/app/modules/sales/infrastructure/services/CatalogSalesGateway';
import { InMemoryCheckoutTransactionManager } from '@src/app/modules/sales/infrastructure/services/InMemoryCheckoutTransactionManager';
import { InventorySalesGateway } from '@src/app/modules/sales/infrastructure/services/InventorySalesGateway';
import { SystemClock } from '@src/shared/application/Clock';
import { EvaluatePromotionsHandler } from '@src/app/modules/promotions/application/queries/EvaluatePromotionsHandler';
import { InMemoryPromotionRepository } from '@src/app/modules/promotions/infrastructure/repositories/in-memory/InMemoryPromotionRepository';
import { PromotionCheckoutAdapter } from '@src/app/modules/promotions/infrastructure/services/PromotionCheckoutAdapter';
import { InMemoryCustomerRepository } from '@src/app/modules/customers/infrastructure/repositories/in-memory/InMemoryCustomerRepository';
import { CustomerCheckoutAdapter } from '@src/app/modules/customers/infrastructure/services/CustomerCheckoutAdapter';

const container = new Container();

container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container.bind<SalesAuthorizationPolicy>(types.SalesAuthorizationPolicy).to(RoleBasedSalesAuthorizationPolicy);
container.bind<SalesClock>(types.SalesClock).to(SystemClock).inSingletonScope();
container.bind<SalesIdGenerator>(types.SalesIdGenerator).to(CryptoIdGenerator).inSingletonScope();
container.bind<InMemoryCatalogStore>(types.SalesCatalogStore).toConstantValue(sharedInMemoryCatalogStore);
container
  .bind<ProductVariantRepository>(types.SalesProductVariantRepository)
  .toDynamicValue(
    (context) => new InMemoryProductVariantRepository(context.get<InMemoryCatalogStore>(types.SalesCatalogStore))
  )
  .inSingletonScope();
container
  .bind<ProductRepository>(types.SalesProductRepository)
  .toDynamicValue(
    (context) => new InMemoryProductRepository(context.get<InMemoryCatalogStore>(types.SalesCatalogStore))
  )
  .inSingletonScope();
container
  .bind<InventoryVariantStockGateway>(types.SalesInventoryStockGateway)
  .toDynamicValue(
    (context) =>
      new InMemoryInventoryVariantStockGateway(
        context.get<ProductVariantRepository>(types.SalesProductVariantRepository)
      )
  )
  .inSingletonScope();
container
  .bind<InMemoryInventoryMovementRepository>(types.SalesInventoryMovementRepository)
  .to(InMemoryInventoryMovementRepository)
  .inSingletonScope();
container
  .bind<SalesCatalogGateway>(types.SalesCatalogGateway)
  .toDynamicValue(
    (context) =>
      new CatalogSalesGateway(
        context.get<ProductVariantRepository>(types.SalesProductVariantRepository),
        context.get<ProductRepository>(types.SalesProductRepository)
      )
  )
  .inSingletonScope();
container
  .bind<SalesPromotionGateway>(types.SalesPromotionGateway)
  .toDynamicValue(() => new PromotionCheckoutAdapter(new EvaluatePromotionsHandler(new InMemoryPromotionRepository())))
  .inSingletonScope();
container
  .bind<SalesCustomerGateway>(types.SalesCustomerGateway)
  .toDynamicValue(() => new CustomerCheckoutAdapter(new InMemoryCustomerRepository()))
  .inSingletonScope();
container
  .bind<SalesInventoryGateway>(types.SalesInventoryGateway)
  .toDynamicValue(
    (context) =>
      new InventorySalesGateway(
        context.get<InventoryVariantStockGateway>(types.SalesInventoryStockGateway),
        context.get<InventoryMovementRepository>(types.SalesInventoryMovementRepository),
        context.get<SalesIdGenerator>(types.SalesIdGenerator)
      )
  )
  .inSingletonScope();
container.bind<InMemorySaleRepository>(types.SaleRepository).to(InMemorySaleRepository).inSingletonScope();
container
  .bind<CheckoutTransactionManager>(types.CheckoutTransactionManager)
  .toDynamicValue(
    (context) =>
      new InMemoryCheckoutTransactionManager(
        context.get<InMemoryCatalogStore>(types.SalesCatalogStore),
        context.get<InMemoryInventoryMovementRepository>(types.SalesInventoryMovementRepository),
        context.get<InMemorySaleRepository>(types.SaleRepository)
      )
  )
  .inSingletonScope();
container
  .bind<CompleteSaleHandler>(types.CompleteSaleHandler)
  .toDynamicValue(
    (context) =>
      new CompleteSaleHandler(
        context.get<SalesCatalogGateway>(types.SalesCatalogGateway),
        context.get<SalesInventoryGateway>(types.SalesInventoryGateway),
        context.get<SaleRepository>(types.SaleRepository),
        context.get<CheckoutTransactionManager>(types.CheckoutTransactionManager),
        context.get<SalesAuthorizationPolicy>(types.SalesAuthorizationPolicy),
        context.get<SalesClock>(types.SalesClock),
        context.get<SalesIdGenerator>(types.SalesIdGenerator),
        context.get<SalesPromotionGateway>(types.SalesPromotionGateway),
        context.get<SalesCustomerGateway>(types.SalesCustomerGateway)
      )
  )
  .inSingletonScope();
container
  .bind<GetSaleByIdHandler>(types.GetSaleByIdHandler)
  .toDynamicValue(
    (context) =>
      new GetSaleByIdHandler(
        context.get<SaleRepository>(types.SaleRepository),
        context.get<SalesAuthorizationPolicy>(types.SalesAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<ListSalesHandler>(types.ListSalesHandler)
  .toDynamicValue(
    (context) =>
      new ListSalesHandler(
        context.get<SaleRepository>(types.SaleRepository),
        context.get<SalesAuthorizationPolicy>(types.SalesAuthorizationPolicy)
      )
  )
  .inSingletonScope();

export default container;
