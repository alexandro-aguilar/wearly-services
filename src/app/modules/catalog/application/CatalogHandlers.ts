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

export interface CatalogHandlers {
  readonly createProduct: CreateProductHandler;
  readonly updateProduct: UpdateProductHandler;
  readonly deactivateProduct: DeactivateProductHandler;
  readonly createProductVariant: CreateProductVariantHandler;
  readonly updateProductVariant: UpdateProductVariantHandler;
  readonly deactivateProductVariant: DeactivateProductVariantHandler;
  readonly getProductById: GetProductByIdHandler;
  readonly listProducts: ListProductsHandler;
  readonly getProductVariantById: GetProductVariantByIdHandler;
  readonly listProductVariants: ListProductVariantsHandler;
}
