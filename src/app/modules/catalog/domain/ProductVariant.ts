import { Barcode } from '@src/app/modules/catalog/domain/Barcode';
import { ProductId, ProductVariantId, StoreId } from '@src/app/modules/catalog/domain/Identifiers';
import { Money } from '@src/app/modules/catalog/domain/Money';
import { Product } from '@src/app/modules/catalog/domain/Product';
import { Quantity } from '@src/app/modules/catalog/domain/Quantity';
import { Sku } from '@src/app/modules/catalog/domain/Sku';
import { ValidationError } from '@src/shared/domain/errors/PlatformError';

export interface ProductVariantSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly productId: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly size?: string;
  readonly color?: string;
  readonly price: number;
  readonly cost: number;
  readonly stock: number;
  readonly minimumStock: number;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProductVariantInput {
  readonly id: string;
  readonly storeId: string;
  readonly productId: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly size?: string;
  readonly color?: string;
  readonly price: number;
  readonly cost: number;
  readonly stock?: number;
  readonly minimumStock?: number;
  readonly now: Date;
}

export interface UpdateProductVariantInput {
  readonly sku?: string;
  readonly barcode?: string;
  readonly size?: string;
  readonly color?: string;
  readonly price?: number;
  readonly cost?: number;
  readonly minimumStock?: number;
  readonly now: Date;
}

export class ProductVariant {
  private constructor(private snapshot: ProductVariantSnapshot) {}

  static create(input: CreateProductVariantInput, product: Product): ProductVariant {
    const productSnapshot = product.toSnapshot();
    const id = ProductVariantId.from(input.id);
    const storeId = StoreId.from(input.storeId);
    const productId = ProductId.from(input.productId);

    if (!productSnapshot.active) {
      throw new ValidationError('Product variants cannot be created for inactive products.');
    }

    if (productSnapshot.storeId !== storeId.value || productSnapshot.id !== productId.value) {
      throw new ValidationError('Product variant product scope is invalid.');
    }

    return new ProductVariant({
      id: id.value,
      storeId: storeId.value,
      productId: productId.value,
      sku: Sku.from(input.sku).value,
      barcode: Barcode.optional(input.barcode)?.value,
      size: normalizeOptional(input.size),
      color: normalizeOptional(input.color),
      price: Money.from(input.price, 'price').amount,
      cost: Money.from(input.cost, 'cost').amount,
      stock: Quantity.from(input.stock ?? 0, 'stock').value,
      minimumStock: Quantity.from(input.minimumStock ?? 0, 'minimumStock').value,
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static rehydrate(snapshot: ProductVariantSnapshot): ProductVariant {
    return new ProductVariant(snapshot);
  }

  update(input: UpdateProductVariantInput): void {
    this.snapshot = {
      ...this.snapshot,
      sku: input.sku === undefined ? this.snapshot.sku : Sku.from(input.sku).value,
      barcode: input.barcode === undefined ? this.snapshot.barcode : Barcode.optional(input.barcode)?.value,
      size: input.size === undefined ? this.snapshot.size : normalizeOptional(input.size),
      color: input.color === undefined ? this.snapshot.color : normalizeOptional(input.color),
      price: input.price === undefined ? this.snapshot.price : Money.from(input.price, 'price').amount,
      cost: input.cost === undefined ? this.snapshot.cost : Money.from(input.cost, 'cost').amount,
      minimumStock:
        input.minimumStock === undefined
          ? this.snapshot.minimumStock
          : Quantity.from(input.minimumStock, 'minimumStock').value,
      updatedAt: input.now,
    };
  }

  deactivate(now: Date): void {
    this.snapshot = {
      ...this.snapshot,
      active: false,
      updatedAt: now,
    };
  }

  toSnapshot(): ProductVariantSnapshot {
    return { ...this.snapshot };
  }
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
