import {
  InventoryMovementRepository,
  InventoryVariantStockGateway,
} from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryMovement } from '@src/app/modules/inventory/domain/InventoryMovement';
import { InventoryVariantStock } from '@src/app/modules/inventory/domain/InventoryVariantStock';
import { SalesInventoryGateway } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { SalesIdGenerator } from '@src/app/modules/sales/application/ports/SalesServices';
import { NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export class InventorySalesGateway implements SalesInventoryGateway {
  constructor(
    private readonly stock: InventoryVariantStockGateway,
    private readonly movements: InventoryMovementRepository,
    private readonly ids: SalesIdGenerator
  ) {}

  async getStock(storeId: string, productVariantId: string): Promise<number | undefined> {
    return (await this.stock.findById(storeId, productVariantId))?.stock;
  }

  async reduceStock(storeId: string, productVariantId: string, quantity: number, createdAt: Date): Promise<void> {
    const existing = await this.stock.findById(storeId, productVariantId);
    if (!existing) {
      throw new NotFoundError('Product variant was not found.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || existing.stock < quantity) {
      throw new ValidationError(`Insufficient stock for product variant ${productVariantId}.`);
    }
    const variant = InventoryVariantStock.rehydrate(existing);
    const change = variant.adjustTo(existing.stock - quantity, createdAt);
    const movement = InventoryMovement.create({
      id: this.ids.nextId('sale'),
      storeId,
      productVariantId,
      type: 'SALE',
      quantity: -quantity,
      previousStock: change.previousStock,
      newStock: change.newStock,
      createdAt,
    });
    await this.stock.saveStock(variant.toSnapshot());
    await this.movements.save(movement.toSnapshot());
  }
}
