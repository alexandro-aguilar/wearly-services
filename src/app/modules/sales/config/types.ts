import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
  SalesAuthorizationPolicy: Symbol.for('SalesAuthorizationPolicy'),
  SalesClock: Symbol.for('SalesClock'),
  SalesIdGenerator: Symbol.for('SalesIdGenerator'),
  SalesCatalogStore: Symbol.for('SalesCatalogStore'),
  SalesProductVariantRepository: Symbol.for('SalesProductVariantRepository'),
  SalesInventoryStockGateway: Symbol.for('SalesInventoryStockGateway'),
  SalesInventoryMovementRepository: Symbol.for('SalesInventoryMovementRepository'),
  SalesCatalogGateway: Symbol.for('SalesCatalogGateway'),
  SalesInventoryGateway: Symbol.for('SalesInventoryGateway'),
  SaleRepository: Symbol.for('SaleRepository'),
  CheckoutTransactionManager: Symbol.for('CheckoutTransactionManager'),
  CompleteSaleHandler: Symbol.for('CompleteSaleHandler'),
  GetSaleByIdHandler: Symbol.for('GetSaleByIdHandler'),
  ListSalesHandler: Symbol.for('ListSalesHandler'),
};

export default types;
