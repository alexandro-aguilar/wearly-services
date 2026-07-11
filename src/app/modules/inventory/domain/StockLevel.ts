import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export class StockLevel {
  private constructor(readonly value: number) {}

  static from(value: number, field: string = 'stock'): StockLevel {
    if (!Number.isInteger(value)) {
      throw new ValidationError(`${field} must be an integer.`);
    }

    if (value < 0) {
      throw new ValidationError(`${field} cannot be negative.`);
    }

    return new StockLevel(value);
  }
}
