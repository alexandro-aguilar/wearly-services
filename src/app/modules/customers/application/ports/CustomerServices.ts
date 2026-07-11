import { AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type CustomerAuthorizationPolicy = AuthorizationPolicy;

export interface CustomerClock {
  now(): Date;
}

export interface CustomerIdGenerator {
  nextId(): string;
}

export interface CustomerSaleHistoryItem {
  readonly id: string;
  readonly storeId: string;
  readonly customerId?: string;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
  readonly status: string;
  readonly createdAt: Date;
}

export interface CustomerSalesHistoryReader {
  listByCustomer(storeId: string, customerId: string): Promise<CustomerSaleHistoryItem[]>;
}
