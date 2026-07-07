import { Container } from 'inversify';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { buildCatalogModule } from '@src/app/modules/catalog/infrastructure/buildCatalogModule';
import types from '@src/app/modules/catalog/config/types';
import { CreateProductHandler } from '@src/app/modules/catalog/application/commands/CreateProductHandler';
import { UpdateProductHandler } from '@src/app/modules/catalog/application/commands/UpdateProductHandler';
import { DeactivateProductHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductHandler';
import { CreateProductVariantHandler } from '@src/app/modules/catalog/application/commands/CreateProductVariantHandler';
import { UpdateProductVariantHandler } from '@src/app/modules/catalog/application/commands/UpdateProductVariantHandler';
import { DeactivateProductVariantHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductVariantHandler';
import { ListProductsHandler } from '@src/app/modules/catalog/application/queries/ListProductsHandler';
import { GetProductByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductByIdHandler';
import { ListProductVariantsHandler } from '@src/app/modules/catalog/application/queries/ListProductVariantsHandler';
import { GetProductVariantByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductVariantByIdHandler';
import ILogger from '@src/app/core/utils/ILogger';

const container = new Container();
const handlers = buildCatalogModule();

container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container.bind<CreateProductHandler>(types.CreateProductHandler).toConstantValue(handlers.createProduct);
container.bind<UpdateProductHandler>(types.UpdateProductHandler).toConstantValue(handlers.updateProduct);
container.bind<DeactivateProductHandler>(types.DeactivateProductHandler).toConstantValue(handlers.deactivateProduct);
container.bind<ListProductsHandler>(types.ListProductsHandler).toConstantValue(handlers.listProducts);
container.bind<GetProductByIdHandler>(types.GetProductByIdHandler).toConstantValue(handlers.getProductById);
container
  .bind<CreateProductVariantHandler>(types.CreateProductVariantHandler)
  .toConstantValue(handlers.createProductVariant);
container
  .bind<UpdateProductVariantHandler>(types.UpdateProductVariantHandler)
  .toConstantValue(handlers.updateProductVariant);
container
  .bind<DeactivateProductVariantHandler>(types.DeactivateProductVariantHandler)
  .toConstantValue(handlers.deactivateProductVariant);
container
  .bind<ListProductVariantsHandler>(types.ListProductVariantsHandler)
  .toConstantValue(handlers.listProductVariants);
container
  .bind<GetProductVariantByIdHandler>(types.GetProductVariantByIdHandler)
  .toConstantValue(handlers.getProductVariantById);

export default container;
