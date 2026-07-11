import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export class Sku {
  private constructor(readonly value: string) {}

  static from(value: string): Sku {
    if (!value?.trim()) {
      throw new ValidationError('SKU is required.');
    }

    return new Sku(value.trim());
  }
}
