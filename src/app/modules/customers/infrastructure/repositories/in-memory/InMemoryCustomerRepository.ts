import {
  CustomerListFilter,
  CustomerRepository,
} from '@src/app/modules/customers/application/ports/CustomerRepositories';
import { cloneCustomer, CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';

export class InMemoryCustomerStore {
  readonly customers = new Map<string, CustomerSnapshot>();
}

export const sharedInMemoryCustomerStore = new InMemoryCustomerStore();

export class InMemoryCustomerRepository implements CustomerRepository {
  constructor(private readonly store: InMemoryCustomerStore = sharedInMemoryCustomerStore) {}

  async save(customer: CustomerSnapshot): Promise<void> {
    this.store.customers.set(key(customer.storeId, customer.id), cloneCustomer(customer));
  }

  async findById(storeId: string, id: string): Promise<CustomerSnapshot | undefined> {
    const customer = this.store.customers.get(key(storeId, id));
    return customer ? cloneCustomer(customer) : undefined;
  }

  async list(storeId: string, filter: CustomerListFilter): Promise<CustomerSnapshot[]> {
    const search = filter.search?.trim().toLowerCase();
    return [...this.store.customers.values()]
      .filter((customer) => customer.storeId === storeId)
      .filter((customer) => filter.active === undefined || customer.active === filter.active)
      .filter(
        (customer) =>
          !search ||
          customer.name.toLowerCase().includes(search) ||
          customer.email?.includes(search) ||
          customer.phone?.includes(search)
      )
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
      .map((customer) => cloneCustomer(customer));
  }
}

function key(storeId: string, customerId: string): string {
  return `${storeId}:${customerId}`;
}
