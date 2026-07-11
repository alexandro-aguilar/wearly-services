import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
  InventoryAuthorizationPolicy: Symbol.for('InventoryAuthorizationPolicy'),
  InventoryClock: Symbol.for('InventoryClock'),
  InventoryIdGenerator: Symbol.for('InventoryIdGenerator'),
  InventoryCatalogStore: Symbol.for('InventoryCatalogStore'),
  InventoryProductVariantRepository: Symbol.for('InventoryProductVariantRepository'),
  InventoryVariantStockGateway: Symbol.for('InventoryVariantStockGateway'),
  InventoryMovementRepository: Symbol.for('InventoryMovementRepository'),
  AdjustInventoryHandler: Symbol.for('AdjustInventoryHandler'),
  GetInventoryAvailabilityHandler: Symbol.for('GetInventoryAvailabilityHandler'),
  ListInventoryMovementsHandler: Symbol.for('ListInventoryMovementsHandler'),
  ListLowStockVariantsHandler: Symbol.for('ListLowStockVariantsHandler'),
};

export default types;
