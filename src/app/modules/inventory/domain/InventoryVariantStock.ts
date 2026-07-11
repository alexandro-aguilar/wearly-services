import { StockLevel } from '@src/app/modules/inventory/domain/StockLevel';

export interface InventoryVariantStockSnapshot {
  readonly storeId: string;
  readonly productVariantId: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly stock: number;
  readonly minimumStock: number;
  readonly active: boolean;
  readonly updatedAt: Date;
}

export interface InventoryAvailabilitySnapshot extends InventoryVariantStockSnapshot {
  readonly available: boolean;
  readonly lowStock: boolean;
}

export class InventoryVariantStock {
  private constructor(private snapshot: InventoryVariantStockSnapshot) {}

  static rehydrate(snapshot: InventoryVariantStockSnapshot): InventoryVariantStock {
    return new InventoryVariantStock({
      ...snapshot,
      stock: StockLevel.from(snapshot.stock).value,
      minimumStock: StockLevel.from(snapshot.minimumStock, 'minimumStock').value,
    });
  }

  adjustTo(
    newStock: number,
    now: Date
  ): { readonly previousStock: number; readonly newStock: number; readonly quantity: number } {
    const previousStock = this.snapshot.stock;
    const nextStock = StockLevel.from(newStock).value;

    this.snapshot = {
      ...this.snapshot,
      stock: nextStock,
      updatedAt: now,
    };

    return {
      previousStock,
      newStock: nextStock,
      quantity: nextStock - previousStock,
    };
  }

  toAvailability(): InventoryAvailabilitySnapshot {
    return {
      ...this.snapshot,
      available: this.snapshot.active && this.snapshot.stock > 0,
      lowStock: this.snapshot.stock <= this.snapshot.minimumStock,
    };
  }

  toSnapshot(): InventoryVariantStockSnapshot {
    return { ...this.snapshot };
  }
}
