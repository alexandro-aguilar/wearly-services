import { ProductId, StoreId } from '@src/app/modules/catalog/domain/Identifiers';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface ProductSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly brandId?: string;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProductInput {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly brandId?: string;
  readonly now: Date;
}

export interface UpdateProductInput {
  readonly name?: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly brandId?: string;
  readonly now: Date;
}

export class Product {
  private constructor(private snapshot: ProductSnapshot) {}

  static create(input: CreateProductInput): Product {
    const id = ProductId.from(input.id);
    const storeId = StoreId.from(input.storeId);
    const name = normalizeRequired(input.name, 'Product name is required.');
    const categoryId = normalizeRequired(input.categoryId, 'categoryId is required.');

    return new Product({
      id: id.value,
      storeId: storeId.value,
      name,
      description: normalizeOptional(input.description),
      categoryId,
      brandId: normalizeOptional(input.brandId),
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static rehydrate(snapshot: ProductSnapshot): Product {
    return new Product(snapshot);
  }

  update(input: UpdateProductInput): void {
    const nextName =
      input.name === undefined ? this.snapshot.name : normalizeRequired(input.name, 'Product name is required.');
    const nextCategoryId =
      input.categoryId === undefined
        ? this.snapshot.categoryId
        : normalizeRequired(input.categoryId, 'categoryId is required.');

    this.snapshot = {
      ...this.snapshot,
      name: nextName,
      description: input.description === undefined ? this.snapshot.description : normalizeOptional(input.description),
      categoryId: nextCategoryId,
      brandId: input.brandId === undefined ? this.snapshot.brandId : normalizeOptional(input.brandId),
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

  toSnapshot(): ProductSnapshot {
    return { ...this.snapshot };
  }
}

function normalizeRequired(value: string, message: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
