import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
  CatalogAuthorizationPolicy: Symbol.for('CatalogAuthorizationPolicy'),
  CatalogIdGenerator: Symbol.for('CatalogIdGenerator'),
  CatalogClock: Symbol.for('CatalogClock'),
  CatalogStore: Symbol.for('CatalogStore'),
  ProductRepository: Symbol.for('ProductRepository'),
  ProductVariantRepository: Symbol.for('ProductVariantRepository'),
  CreateProductHandler: Symbol.for('CreateProductHandler'),
  UpdateProductHandler: Symbol.for('UpdateProductHandler'),
  DeactivateProductHandler: Symbol.for('DeactivateProductHandler'),
  ListProductsHandler: Symbol.for('ListProductsHandler'),
  GetProductByIdHandler: Symbol.for('GetProductByIdHandler'),
  CreateProductVariantHandler: Symbol.for('CreateProductVariantHandler'),
  UpdateProductVariantHandler: Symbol.for('UpdateProductVariantHandler'),
  DeactivateProductVariantHandler: Symbol.for('DeactivateProductVariantHandler'),
  ListProductVariantsHandler: Symbol.for('ListProductVariantsHandler'),
  GetProductVariantByIdHandler: Symbol.for('GetProductVariantByIdHandler'),
};

export default types;
