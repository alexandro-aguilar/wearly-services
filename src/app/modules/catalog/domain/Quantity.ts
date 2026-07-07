import { ValidationError } from '@src/shared/domain/errors/PlatformError';

export class Quantity {
  private constructor(readonly value: number) {}

  static from(value: number, field: string): Quantity {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError(`${field} cannot be negative.`);
    }

    return new Quantity(value);
  }
}
