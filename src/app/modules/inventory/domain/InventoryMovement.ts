import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export type InventoryMovementType = 'SALE' | 'PURCHASE' | 'MANUAL_ADJUSTMENT' | 'RETURN' | 'TRANSFER';

export interface InventoryMovementSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly productVariantId: string;
  readonly type: InventoryMovementType;
  readonly quantity: number;
  readonly previousStock: number;
  readonly newStock: number;
  readonly createdAt: Date;
}

export interface CreateInventoryMovementInput {
  readonly id: string;
  readonly storeId: string;
  readonly productVariantId: string;
  readonly type: InventoryMovementType;
  readonly quantity: number;
  readonly previousStock: number;
  readonly newStock: number;
  readonly createdAt: Date;
}

export class InventoryMovement {
  private constructor(private readonly snapshot: InventoryMovementSnapshot) {}

  static create(input: CreateInventoryMovementInput): InventoryMovement {
    if (!input.id.trim()) {
      throw new ValidationError('Inventory movement id is required.');
    }

    if (!input.storeId.trim()) {
      throw new ValidationError('storeId is required.');
    }

    if (!input.productVariantId.trim()) {
      throw new ValidationError('productVariantId is required.');
    }

    if (!Number.isInteger(input.quantity) || input.quantity === 0) {
      throw new ValidationError('Inventory movement quantity must be a non-zero integer.');
    }

    if (input.newStock < 0 || !Number.isInteger(input.previousStock) || !Number.isInteger(input.newStock)) {
      throw new ValidationError('Inventory movement stock levels are invalid.');
    }

    return new InventoryMovement({
      id: input.id,
      storeId: input.storeId,
      productVariantId: input.productVariantId,
      type: input.type,
      quantity: input.quantity,
      previousStock: input.previousStock,
      newStock: input.newStock,
      createdAt: input.createdAt,
    });
  }

  toSnapshot(): InventoryMovementSnapshot {
    return { ...this.snapshot };
  }
}
