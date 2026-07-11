import { InventoryMovementSnapshot } from '@src/app/modules/inventory/domain/InventoryMovement';
import { InventoryVariantStockSnapshot } from '@src/app/modules/inventory/domain/InventoryVariantStock';

export interface InventoryVariantStockGateway {
  findById(storeId: string, productVariantId: string): Promise<InventoryVariantStockSnapshot | undefined>;
  listLowStock(storeId: string): Promise<InventoryVariantStockSnapshot[]>;
  saveStock(variant: InventoryVariantStockSnapshot): Promise<void>;
}

export interface InventoryMovementRepository {
  save(movement: InventoryMovementSnapshot): Promise<void>;
  list(storeId: string, productVariantId?: string): Promise<InventoryMovementSnapshot[]>;
}
