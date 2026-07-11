import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export class Money {
  private constructor(readonly amount: number) {}

  static from(amount: number, field: string): Money {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new ValidationError(`${field} cannot be negative.`);
    }

    return new Money(amount);
  }
}
