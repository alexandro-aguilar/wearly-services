import { describe, expect, it } from 'vitest';
import { CreateCustomerHandler } from '@src/app/modules/customers/application/commands/CreateCustomerHandler';
import { DeactivateCustomerHandler } from '@src/app/modules/customers/application/commands/DeactivateCustomerHandler';
import { UpdateCustomerHandler } from '@src/app/modules/customers/application/commands/UpdateCustomerHandler';
import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import {
  CustomerAuthorizationPolicy,
  CustomerClock,
  CustomerIdGenerator,
  CustomerSalesHistoryReader,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { RoleBasedCustomerAuthorizationPolicy } from '@src/app/modules/customers/application/CustomerAuthorizationPolicy';
import { GetCustomerByIdHandler } from '@src/app/modules/customers/application/queries/GetCustomerByIdHandler';
import { GetCustomerSalesHistoryHandler } from '@src/app/modules/customers/application/queries/GetCustomerSalesHistoryHandler';
import { ListCustomersHandler } from '@src/app/modules/customers/application/queries/ListCustomersHandler';
import { SearchCustomersHandler } from '@src/app/modules/customers/application/queries/SearchCustomersHandler';
import { CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

describe('customer command and query handlers', () => {
  it('creates, updates, reads, and lists a customer in the authenticated store', async () => {
    const customers = buildHarness();
    const created = await customers.create.execute(cashier('store-a'), {
      name: '  Ada Lovelace  ',
      email: 'ADA@EXAMPLE.COM',
      phone: '+529991234567',
    });

    await customers.update.execute(cashier('store-a'), created.id, { name: 'Ada Byron' });

    await expect(customers.getById.execute(cashier('store-a'), created.id)).resolves.toMatchObject({
      id: 'customer-1',
      storeId: 'store-a',
      name: 'Ada Byron',
      email: 'ada@example.com',
      phone: '+529991234567',
      active: true,
    });
    await expect(customers.list.execute(manager('store-a'))).resolves.toHaveLength(1);
  });

  it('rejects invalid email and phone values', async () => {
    const customers = buildHarness();
    await expect(
      customers.create.execute(cashier('store-a'), { name: 'Ada', email: 'not-an-email' })
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(customers.create.execute(cashier('store-a'), { name: 'Ada', phone: '123' })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it('prevents cross-store reads and mutations', async () => {
    const customers = buildHarness();
    const created = await customers.create.execute(cashier('store-a'), { name: 'Ada' });

    await expect(customers.getById.execute(cashier('store-b'), created.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      customers.update.execute(cashier('store-b'), created.id, { name: 'Wrong store' })
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(customers.deactivate.execute(manager('store-b'), created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('searches by normalized name, email, or phone and excludes inactive customers by default', async () => {
    const customers = buildHarness();
    await customers.create.execute(cashier('store-a'), { name: 'Ada Lovelace', email: 'ada@example.com' });
    const grace = await customers.create.execute(cashier('store-a'), {
      name: 'Grace Hopper',
      phone: '+15551234567',
    });
    await customers.deactivate.execute(manager('store-a'), grace.id);

    await expect(customers.search.execute(cashier('store-a'), ' ADA@EXAMPLE ')).resolves.toEqual([
      expect.objectContaining({ name: 'Ada Lovelace' }),
    ]);
    await expect(customers.search.execute(cashier('store-a'), 'Grace')).resolves.toEqual([]);
    await expect(customers.list.execute(manager('store-a'), { active: false })).resolves.toEqual([
      expect.objectContaining({ name: 'Grace Hopper', active: false }),
    ]);
  });

  it('reads store-scoped sale history without customer updates altering it', async () => {
    const sales = [
      sale({ id: 'sale-a', storeId: 'store-a', customerId: 'customer-1' }),
      sale({ id: 'sale-b', storeId: 'store-b', customerId: 'customer-1' }),
    ];
    const history: CustomerSalesHistoryReader = {
      listByCustomer: async (storeId, customerId) =>
        sales.filter((item) => item.storeId === storeId && item.customerId === customerId),
    };
    const customers = buildHarness(history);
    await customers.create.execute(cashier('store-a'), { name: 'Ada' });
    await customers.update.execute(cashier('store-a'), 'customer-1', { name: 'Ada Byron' });

    await expect(customers.history.execute(cashier('store-a'), 'customer-1')).resolves.toEqual([
      expect.objectContaining({ id: 'sale-a', customerId: 'customer-1' }),
    ]);
  });
});

class FakeCustomerRepository implements CustomerRepository {
  private readonly customers: CustomerSnapshot[] = [];

  async save(customer: CustomerSnapshot): Promise<void> {
    const index = this.customers.findIndex((item) => item.storeId === customer.storeId && item.id === customer.id);
    if (index === -1) this.customers.push(customer);
    else this.customers[index] = customer;
  }

  async findById(storeId: string, id: string): Promise<CustomerSnapshot | undefined> {
    return this.customers.find((customer) => customer.storeId === storeId && customer.id === id);
  }

  async list(storeId: string, filter: { active?: boolean; search?: string }): Promise<CustomerSnapshot[]> {
    const search = filter.search?.trim().toLowerCase();
    return this.customers
      .filter((customer) => customer.storeId === storeId)
      .filter((customer) => filter.active === undefined || customer.active === filter.active)
      .filter(
        (customer) =>
          !search ||
          customer.name.toLowerCase().includes(search) ||
          customer.email?.includes(search) ||
          customer.phone?.includes(search)
      );
  }
}

class SequentialCustomerIdGenerator implements CustomerIdGenerator {
  private next = 0;
  nextId(): string {
    this.next += 1;
    return `customer-${this.next}`;
  }
}

function buildHarness(history: CustomerSalesHistoryReader = { listByCustomer: async () => [] }) {
  const repository = new FakeCustomerRepository();
  const authorization: CustomerAuthorizationPolicy = new RoleBasedCustomerAuthorizationPolicy();
  const clock: CustomerClock = { now: () => new Date('2026-01-01T00:00:00.000Z') };
  const ids = new SequentialCustomerIdGenerator();
  return {
    create: new CreateCustomerHandler(repository, authorization, clock, ids),
    update: new UpdateCustomerHandler(repository, authorization, clock),
    deactivate: new DeactivateCustomerHandler(repository, authorization, clock),
    getById: new GetCustomerByIdHandler(repository, authorization),
    list: new ListCustomersHandler(repository, authorization),
    search: new SearchCustomersHandler(repository, authorization),
    history: new GetCustomerSalesHistoryHandler(repository, history, authorization),
  };
}

function sale(input: { id: string; storeId: string; customerId: string }): SaleSnapshot {
  return {
    ...input,
    subtotal: 100,
    discount: 0,
    tax: 0,
    total: 100,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    items: [],
  };
}

function manager(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'manager', storeId, roles: ['MANAGER'] };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'cashier', storeId, roles: ['CASHIER'] };
}
