import { CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';

export interface CustomerListFilter {
  readonly active?: boolean;
  readonly search?: string;
}

export interface CustomerRepository {
  save(customer: CustomerSnapshot): Promise<void>;
  findById(storeId: string, id: string): Promise<CustomerSnapshot | undefined>;
  list(storeId: string, filter: CustomerListFilter): Promise<CustomerSnapshot[]>;
}
