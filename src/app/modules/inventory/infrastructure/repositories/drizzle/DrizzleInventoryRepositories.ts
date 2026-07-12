import { and, asc, eq, lte } from 'drizzle-orm';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';
import { inventoryMovements, productVariants } from '@src/app/core/infrastructure/database/schema';
import {
  InventoryMovementRepository,
  InventoryVariantStockGateway,
} from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryMovementSnapshot } from '@src/app/modules/inventory/domain/InventoryMovement';
import { InventoryVariantStockSnapshot } from '@src/app/modules/inventory/domain/InventoryVariantStock';

export class DrizzleInventoryVariantStockGateway implements InventoryVariantStockGateway {
  constructor(private readonly override?: typeof db) {}
  private get database(): typeof db {
    return this.override ?? CheckoutTransactionContext.current();
  }
  async findById(storeId: string, productVariantId: string): Promise<InventoryVariantStockSnapshot | undefined> {
    const [row] = await this.database
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.storeId, storeId), eq(productVariants.id, productVariantId)))
      .limit(1);
    return row
      ? {
          storeId: row.storeId,
          productVariantId: row.id,
          sku: row.sku,
          barcode: row.barcode ?? undefined,
          stock: row.stock,
          minimumStock: row.minimumStock,
          active: row.active,
          updatedAt: row.updatedAt,
        }
      : undefined;
  }
  async listLowStock(storeId: string): Promise<InventoryVariantStockSnapshot[]> {
    const rows = await this.database
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.storeId, storeId), lte(productVariants.stock, productVariants.minimumStock)))
      .orderBy(asc(productVariants.id));
    return rows.map((row) => ({
      storeId: row.storeId,
      productVariantId: row.id,
      sku: row.sku,
      barcode: row.barcode ?? undefined,
      stock: row.stock,
      minimumStock: row.minimumStock,
      active: row.active,
      updatedAt: row.updatedAt,
    }));
  }
  async saveStock(variant: InventoryVariantStockSnapshot): Promise<void> {
    await this.database
      .update(productVariants)
      .set({ stock: variant.stock, updatedAt: variant.updatedAt })
      .where(and(eq(productVariants.storeId, variant.storeId), eq(productVariants.id, variant.productVariantId)));
  }
}
export class DrizzleInventoryMovementRepository implements InventoryMovementRepository {
  constructor(private readonly override?: typeof db) {}
  private get database(): typeof db {
    return this.override ?? CheckoutTransactionContext.current();
  }
  async save(movement: InventoryMovementSnapshot): Promise<void> {
    await this.database.insert(inventoryMovements).values({
      id: movement.id,
      storeId: movement.storeId,
      productVariantId: movement.productVariantId,
      type: movement.type,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      newStock: movement.newStock,
      createdAt: movement.createdAt,
    });
  }
  async list(storeId: string, productVariantId?: string): Promise<InventoryMovementSnapshot[]> {
    const rows = await this.database
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.storeId, storeId),
          productVariantId ? eq(inventoryMovements.productVariantId, productVariantId) : undefined
        )
      )
      .orderBy(asc(inventoryMovements.createdAt));
    return rows.map((row) => ({
      id: row.id,
      storeId: row.storeId,
      productVariantId: row.productVariantId,
      type: row.type as InventoryMovementSnapshot['type'],
      quantity: row.quantity,
      previousStock: row.previousStock,
      newStock: row.newStock,
      createdAt: row.createdAt,
    }));
  }
}
