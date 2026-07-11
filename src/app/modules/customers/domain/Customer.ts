import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface CustomerSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCustomerInput {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly now: Date;
}

export interface UpdateCustomerInput {
  readonly name?: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly now: Date;
}

export class Customer {
  private constructor(private snapshot: CustomerSnapshot) {}

  static create(input: CreateCustomerInput): Customer {
    return new Customer({
      id: required(input.id, 'Customer id is required.'),
      storeId: required(input.storeId, 'storeId is required.'),
      name: required(input.name, 'Customer name is required.'),
      phone: normalizePhone(input.phone),
      email: normalizeEmail(input.email),
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static rehydrate(snapshot: CustomerSnapshot): Customer {
    return new Customer(cloneCustomer(snapshot));
  }

  update(input: UpdateCustomerInput): void {
    this.snapshot = {
      ...this.snapshot,
      name: input.name === undefined ? this.snapshot.name : required(input.name, 'Customer name is required.'),
      phone:
        input.phone === undefined
          ? this.snapshot.phone
          : input.phone === null
            ? undefined
            : normalizePhone(input.phone),
      email:
        input.email === undefined
          ? this.snapshot.email
          : input.email === null
            ? undefined
            : normalizeEmail(input.email),
      updatedAt: input.now,
    };
  }

  deactivate(now: Date): void {
    this.snapshot = { ...this.snapshot, active: false, updatedAt: now };
  }

  toSnapshot(): CustomerSnapshot {
    return cloneCustomer(this.snapshot);
  }
}

export function cloneCustomer(customer: CustomerSnapshot): CustomerSnapshot {
  return {
    ...customer,
    createdAt: new Date(customer.createdAt),
    updatedAt: new Date(customer.updatedAt),
  };
}

function required(value: string, message: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ValidationError(message);
  return normalized;
}

function normalizeEmail(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError('Customer email is invalid.');
  }
  return normalized;
}

function normalizePhone(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/[\s()-]/g, '');
  if (!normalized) return undefined;
  if (!/^\+?[1-9]\d{6,14}$/.test(normalized)) {
    throw new ValidationError('Customer phone is invalid.');
  }
  return normalized;
}
