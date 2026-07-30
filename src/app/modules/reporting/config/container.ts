import { Container } from 'inversify';
import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { sharedInMemoryCatalogStore } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';
import { InMemoryProductVariantRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductVariantRepository';
import { InMemoryProductRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductRepository';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { InventoryVariantStockGateway } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InMemoryInventoryVariantStockGateway } from '@src/app/modules/inventory/infrastructure/repositories/in-memory/InMemoryInventoryVariantStockGateway';
import { DrizzleInventoryVariantStockGateway } from '@src/app/modules/inventory/infrastructure/repositories/drizzle/DrizzleInventoryRepositories';
import {
  ReportingInventoryReader,
  ReportingCatalogReader,
  ReportingSalesReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { GetBestSellersReportHandler } from '@src/app/modules/reporting/application/queries/GetBestSellersReportHandler';
import { GetDailySalesReportHandler } from '@src/app/modules/reporting/application/queries/GetDailySalesReportHandler';
import { GetLowStockReportHandler } from '@src/app/modules/reporting/application/queries/GetLowStockReportHandler';
import { GetSalesOverviewReportHandler } from '@src/app/modules/reporting/application/queries/GetSalesOverviewReportHandler';
import { RoleBasedReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ReportingAuthorizationPolicy';
import types from '@src/app/modules/reporting/config/types';
import { InventoryReportingReader } from '@src/app/modules/reporting/infrastructure/services/InventoryReportingReader';
import { CatalogReportingReader } from '@src/app/modules/reporting/infrastructure/services/CatalogReportingReader';
import { SalesReportingReader } from '@src/app/modules/reporting/infrastructure/services/SalesReportingReader';
import { InMemorySaleRepository } from '@src/app/modules/sales/infrastructure/repositories/in-memory/InMemorySaleRepository';
import { DrizzleSaleRepository } from '@src/app/modules/sales/infrastructure/repositories/drizzle/DrizzleSaleRepository';

const container = new Container();
const useDrizzleReporting = process.env.CHECKOUT_PERSISTENCE === 'drizzle';
container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container
  .bind<ReportingAuthorizationPolicy>(types.ReportingAuthorizationPolicy)
  .to(RoleBasedReportingAuthorizationPolicy)
  .inSingletonScope();
container
  .bind<ReportingSalesReader>(types.ReportingSalesReader)
  .toDynamicValue(
    () => new SalesReportingReader(useDrizzleReporting ? new DrizzleSaleRepository() : new InMemorySaleRepository())
  )
  .inSingletonScope();
container
  .bind<ReportingInventoryReader>(types.ReportingInventoryReader)
  .toDynamicValue(() => {
    if (useDrizzleReporting) return new InventoryReportingReader(new DrizzleInventoryVariantStockGateway());
    const variants: ProductVariantRepository = new InMemoryProductVariantRepository(sharedInMemoryCatalogStore);
    const inventory: InventoryVariantStockGateway = new InMemoryInventoryVariantStockGateway(variants);
    return new InventoryReportingReader(inventory);
  })
  .inSingletonScope();
container
  .bind<ReportingCatalogReader>(types.ReportingCatalogReader)
  .toDynamicValue(() => {
    const products: ProductRepository = new InMemoryProductRepository(sharedInMemoryCatalogStore);
    const variants: ProductVariantRepository = new InMemoryProductVariantRepository(sharedInMemoryCatalogStore);
    return new CatalogReportingReader(products, variants);
  })
  .inSingletonScope();
container
  .bind<GetDailySalesReportHandler>(types.GetDailySalesReportHandler)
  .toDynamicValue(
    (context) =>
      new GetDailySalesReportHandler(
        context.get<ReportingSalesReader>(types.ReportingSalesReader),
        context.get<ReportingAuthorizationPolicy>(types.ReportingAuthorizationPolicy)
      )
  );
container
  .bind<GetBestSellersReportHandler>(types.GetBestSellersReportHandler)
  .toDynamicValue(
    (context) =>
      new GetBestSellersReportHandler(
        context.get<ReportingSalesReader>(types.ReportingSalesReader),
        context.get<ReportingAuthorizationPolicy>(types.ReportingAuthorizationPolicy),
        context.get<ReportingCatalogReader>(types.ReportingCatalogReader)
      )
  );
container
  .bind<GetLowStockReportHandler>(types.GetLowStockReportHandler)
  .toDynamicValue(
    (context) =>
      new GetLowStockReportHandler(
        context.get<ReportingInventoryReader>(types.ReportingInventoryReader),
        context.get<ReportingAuthorizationPolicy>(types.ReportingAuthorizationPolicy),
        context.get<ReportingCatalogReader>(types.ReportingCatalogReader)
      )
  );
container
  .bind<GetSalesOverviewReportHandler>(types.GetSalesOverviewReportHandler)
  .toDynamicValue(
    (context) =>
      new GetSalesOverviewReportHandler(
        context.get<ReportingSalesReader>(types.ReportingSalesReader),
        context.get<ReportingAuthorizationPolicy>(types.ReportingAuthorizationPolicy)
      )
  );

export default container;
