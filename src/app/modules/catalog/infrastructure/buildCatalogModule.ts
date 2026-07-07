import { CatalogHandlers } from '@src/app/modules/catalog/application/CatalogHandlers';
import { RoleBasedCatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/CatalogAuthorizationPolicy';
import { CreateProductHandler } from '@src/app/modules/catalog/application/commands/CreateProductHandler';
import { CreateProductVariantHandler } from '@src/app/modules/catalog/application/commands/CreateProductVariantHandler';
import { DeactivateProductHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductHandler';
import { DeactivateProductVariantHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductVariantHandler';
import { UpdateProductHandler } from '@src/app/modules/catalog/application/commands/UpdateProductHandler';
import { UpdateProductVariantHandler } from '@src/app/modules/catalog/application/commands/UpdateProductVariantHandler';
import { GetProductByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductByIdHandler';
import { GetProductVariantByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductVariantByIdHandler';
import { ListProductVariantsHandler } from '@src/app/modules/catalog/application/queries/ListProductVariantsHandler';
import { ListProductsHandler } from '@src/app/modules/catalog/application/queries/ListProductsHandler';
import { SystemClock } from '@src/shared/application/Clock';
import { CryptoIdGenerator } from '@src/app/modules/catalog/infrastructure/CryptoIdGenerator';
import {
  InMemoryCatalogStore,
  InMemoryProductRepository,
  InMemoryProductVariantRepository,
} from '@src/app/modules/catalog/infrastructure/InMemoryCatalogStore';

export function buildCatalogModule(): CatalogHandlers {
  const store = new InMemoryCatalogStore();
  const products = new InMemoryProductRepository(store);
  const variants = new InMemoryProductVariantRepository(store);
  const authorizationPolicy = new RoleBasedCatalogAuthorizationPolicy();
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();

  return {
    createProduct: new CreateProductHandler(products, authorizationPolicy, clock, idGenerator),
    updateProduct: new UpdateProductHandler(products, authorizationPolicy, clock),
    deactivateProduct: new DeactivateProductHandler(products, authorizationPolicy, clock),
    createProductVariant: new CreateProductVariantHandler(products, variants, authorizationPolicy, clock, idGenerator),
    updateProductVariant: new UpdateProductVariantHandler(variants, authorizationPolicy, clock),
    deactivateProductVariant: new DeactivateProductVariantHandler(variants, authorizationPolicy, clock),
    getProductById: new GetProductByIdHandler(products, authorizationPolicy),
    listProducts: new ListProductsHandler(products, authorizationPolicy),
    getProductVariantById: new GetProductVariantByIdHandler(variants, authorizationPolicy),
    listProductVariants: new ListProductVariantsHandler(variants, authorizationPolicy),
  };
}
