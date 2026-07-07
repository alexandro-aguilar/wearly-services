import { ValidationError } from '@src/shared/domain/errors/PlatformError';

export class StoreId {
  private constructor(readonly value: string) {}

  static from(value: string): StoreId {
    assertNonBlank(value, 'storeId is required.');
    return new StoreId(value.trim());
  }
}

export class ProductId {
  private constructor(readonly value: string) {}

  static from(value: string): ProductId {
    assertNonBlank(value, 'productId is required.');
    return new ProductId(value.trim());
  }
}

export class ProductVariantId {
  private constructor(readonly value: string) {}

  static from(value: string): ProductVariantId {
    assertNonBlank(value, 'productVariantId is required.');
    return new ProductVariantId(value.trim());
  }
}

function assertNonBlank(value: string, message: string): void {
  if (!value?.trim()) {
    throw new ValidationError(message);
  }
}
