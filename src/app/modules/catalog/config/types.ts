import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
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
