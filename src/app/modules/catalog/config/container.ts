import { Container } from 'inversify';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { CryptoIdGenerator } from '@src/app/core/utils/CryptoIdGenerator';
import types from '@src/app/modules/catalog/config/types';
import { RoleBasedCatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/CatalogAuthorizationPolicy';
import { CreateProductHandler } from '@src/app/modules/catalog/application/commands/CreateProductHandler';
import { UpdateProductHandler } from '@src/app/modules/catalog/application/commands/UpdateProductHandler';
import { DeactivateProductHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductHandler';
import { CreateProductVariantHandler } from '@src/app/modules/catalog/application/commands/CreateProductVariantHandler';
import { UpdateProductVariantHandler } from '@src/app/modules/catalog/application/commands/UpdateProductVariantHandler';
import { DeactivateProductVariantHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductVariantHandler';
import { ListProductsHandler } from '@src/app/modules/catalog/application/queries/ListProductsHandler';
import { DiscoverProductsHandler } from '@src/app/modules/catalog/application/queries/DiscoverProductsHandler';
import { GetProductByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductByIdHandler';
import { ListProductVariantsHandler } from '@src/app/modules/catalog/application/queries/ListProductVariantsHandler';
import { DiscoverVariantsHandler } from '@src/app/modules/catalog/application/queries/DiscoverVariantsHandler';
import { GetProductVariantByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductVariantByIdHandler';
import {
  CatalogAuthorizationPolicy,
  CatalogClock,
  IdGenerator,
} from '@src/app/modules/catalog/application/ports/CatalogServices';
import {
  ProductRepository,
  ProductVariantRepository,
  CatalogDiscoveryReadRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  InMemoryCatalogStore,
  sharedInMemoryCatalogStore,
} from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';
import { InMemoryProductRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductRepository';
import { InMemoryProductVariantRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryProductVariantRepository';
import { InMemoryCatalogDiscoveryRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogDiscoveryRepository';
import ILogger from '@src/app/core/utils/ILogger';
import { SystemClock } from '@src/shared/application/Clock';

const container = new Container();

container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container
  .bind<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
  .to(RoleBasedCatalogAuthorizationPolicy)
  .inSingletonScope();
container.bind<CatalogClock>(types.CatalogClock).to(SystemClock).inSingletonScope();
container.bind<IdGenerator>(types.CatalogIdGenerator).to(CryptoIdGenerator).inSingletonScope();
container.bind<InMemoryCatalogStore>(types.CatalogStore).toConstantValue(sharedInMemoryCatalogStore);
container
  .bind<ProductRepository>(types.ProductRepository)
  .toDynamicValue((context) => new InMemoryProductRepository(context.get<InMemoryCatalogStore>(types.CatalogStore)))
  .inSingletonScope();
container
  .bind<ProductVariantRepository>(types.ProductVariantRepository)
  .toDynamicValue(
    (context) => new InMemoryProductVariantRepository(context.get<InMemoryCatalogStore>(types.CatalogStore))
  )
  .inSingletonScope();
container
  .bind<CatalogDiscoveryReadRepository>(types.CatalogDiscoveryReadRepository)
  .toDynamicValue(
    (context) => new InMemoryCatalogDiscoveryRepository(context.get<InMemoryCatalogStore>(types.CatalogStore))
  )
  .inSingletonScope();

container
  .bind<CreateProductHandler>(types.CreateProductHandler)
  .toDynamicValue(
    (context) =>
      new CreateProductHandler(
        context.get<ProductRepository>(types.ProductRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy),
        context.get<CatalogClock>(types.CatalogClock),
        context.get<IdGenerator>(types.CatalogIdGenerator)
      )
  )
  .inSingletonScope();
container
  .bind<UpdateProductHandler>(types.UpdateProductHandler)
  .toDynamicValue(
    (context) =>
      new UpdateProductHandler(
        context.get<ProductRepository>(types.ProductRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy),
        context.get<CatalogClock>(types.CatalogClock)
      )
  )
  .inSingletonScope();
container
  .bind<DeactivateProductHandler>(types.DeactivateProductHandler)
  .toDynamicValue(
    (context) =>
      new DeactivateProductHandler(
        context.get<ProductRepository>(types.ProductRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy),
        context.get<CatalogClock>(types.CatalogClock)
      )
  )
  .inSingletonScope();
container
  .bind<ListProductsHandler>(types.ListProductsHandler)
  .toDynamicValue(
    (context) =>
      new ListProductsHandler(
        context.get<ProductRepository>(types.ProductRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<DiscoverProductsHandler>(types.DiscoverProductsHandler)
  .toDynamicValue(
    (context) =>
      new DiscoverProductsHandler(
        context.get<CatalogDiscoveryReadRepository>(types.CatalogDiscoveryReadRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<GetProductByIdHandler>(types.GetProductByIdHandler)
  .toDynamicValue(
    (context) =>
      new GetProductByIdHandler(
        context.get<ProductRepository>(types.ProductRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<CreateProductVariantHandler>(types.CreateProductVariantHandler)
  .toDynamicValue(
    (context) =>
      new CreateProductVariantHandler(
        context.get<ProductRepository>(types.ProductRepository),
        context.get<ProductVariantRepository>(types.ProductVariantRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy),
        context.get<CatalogClock>(types.CatalogClock),
        context.get<IdGenerator>(types.CatalogIdGenerator)
      )
  )
  .inSingletonScope();
container
  .bind<UpdateProductVariantHandler>(types.UpdateProductVariantHandler)
  .toDynamicValue(
    (context) =>
      new UpdateProductVariantHandler(
        context.get<ProductVariantRepository>(types.ProductVariantRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy),
        context.get<CatalogClock>(types.CatalogClock)
      )
  )
  .inSingletonScope();
container
  .bind<DeactivateProductVariantHandler>(types.DeactivateProductVariantHandler)
  .toDynamicValue(
    (context) =>
      new DeactivateProductVariantHandler(
        context.get<ProductVariantRepository>(types.ProductVariantRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy),
        context.get<CatalogClock>(types.CatalogClock)
      )
  )
  .inSingletonScope();
container
  .bind<ListProductVariantsHandler>(types.ListProductVariantsHandler)
  .toDynamicValue(
    (context) =>
      new ListProductVariantsHandler(
        context.get<ProductVariantRepository>(types.ProductVariantRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<DiscoverVariantsHandler>(types.DiscoverVariantsHandler)
  .toDynamicValue(
    (context) =>
      new DiscoverVariantsHandler(
        context.get<CatalogDiscoveryReadRepository>(types.CatalogDiscoveryReadRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
      )
  )
  .inSingletonScope();
container
  .bind<GetProductVariantByIdHandler>(types.GetProductVariantByIdHandler)
  .toDynamicValue(
    (context) =>
      new GetProductVariantByIdHandler(
        context.get<ProductVariantRepository>(types.ProductVariantRepository),
        context.get<CatalogAuthorizationPolicy>(types.CatalogAuthorizationPolicy)
      )
  )
  .inSingletonScope();

export default container;
