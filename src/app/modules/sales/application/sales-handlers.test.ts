import { describe, expect, it } from 'vitest';
import { CompleteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteSaleHandler';
import { RoleBasedSalesAuthorizationPolicy } from '@src/app/modules/sales/application/SalesAuthorizationPolicy';
import {
  CheckoutTransactionManager,
  SaleRepository,
  SalesCatalogGateway,
  SalesInventoryGateway,
} from '@src/app/modules/sales/application/ports/SalesRepositories';
import { SalesClock, SalesIdGenerator } from '@src/app/modules/sales/application/ports/SalesServices';
import { GetSaleByIdHandler } from '@src/app/modules/sales/application/queries/GetSaleByIdHandler';
import { ListSalesHandler } from '@src/app/modules/sales/application/queries/ListSalesHandler';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError, NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

describe('sales checkout handlers', () => {
  it('completes a sale with authoritative prices and reduces stock', async () => {
    const sales = buildSalesHarness([variant({ id: 'variant-1', storeId: 'store-a', price: 125, stock: 5 })]);

    const result = await sales.complete.execute(cashier('store-a'), {
      items: [{ productVariantId: 'variant-1', quantity: 2 }],
      paymentMethod: 'CARD',
      subtotal: 1,
      discount: 999,
      total: 0,
    });

    expect(result).toEqual({ id: 'sale-1', status: 'COMPLETED' });
    await expect(sales.getById.execute(cashier('store-a'), 'sale-1')).resolves.toMatchObject({
      subtotal: 250,
      discount: 0,
      tax: 0,
      total: 250,
      items: [
        {
          productVariantId: 'variant-1',
          quantity: 2,
          unitPrice: 125,
          discount: 0,
          total: 250,
        },
      ],
    });
    expect(sales.inventory.stockOf('store-a', 'variant-1')).toBe(3);
    expect(sales.inventory.movements).toEqual([
      expect.objectContaining({
        type: 'SALE',
        quantity: -2,
        previousStock: 5,
        newStock: 3,
      }),
    ]);
  });

  it('aggregates duplicate line items before checking and reducing stock', async () => {
    const sales = buildSalesHarness([variant({ id: 'variant-1', storeId: 'store-a', price: 20, stock: 3 })]);

    await sales.complete.execute(cashier('store-a'), {
      items: [
        { productVariantId: 'variant-1', quantity: 1 },
        { productVariantId: 'variant-1', quantity: 2 },
      ],
      paymentMethod: 'CASH',
    });

    const sale = await sales.getById.execute(cashier('store-a'), 'sale-1');
    expect(sale.items).toEqual([expect.objectContaining({ productVariantId: 'variant-1', quantity: 3, total: 60 })]);
    expect(sales.inventory.stockOf('store-a', 'variant-1')).toBe(0);
  });

  it('rejects insufficient stock without persisting partial checkout changes', async () => {
    const sales = buildSalesHarness([
      variant({ id: 'variant-1', storeId: 'store-a', price: 10, stock: 2 }),
      variant({ id: 'variant-2', storeId: 'store-a', price: 20, stock: 1 }),
    ]);

    await expect(
      sales.complete.execute(cashier('store-a'), {
        items: [
          { productVariantId: 'variant-1', quantity: 1 },
          { productVariantId: 'variant-2', quantity: 2 },
        ],
        paymentMethod: 'CASH',
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(sales.inventory.stockOf('store-a', 'variant-1')).toBe(2);
    expect(sales.inventory.stockOf('store-a', 'variant-2')).toBe(1);
    expect(sales.inventory.movements).toHaveLength(0);
    await expect(sales.list.execute(cashier('store-a'))).resolves.toEqual([]);
  });

  it('rejects inactive, missing, and cross-store variants as not found', async () => {
    const sales = buildSalesHarness([
      variant({ id: 'inactive', storeId: 'store-a', price: 10, stock: 2, active: false }),
      variant({ id: 'other-store', storeId: 'store-b', price: 10, stock: 2 }),
    ]);

    for (const productVariantId of ['inactive', 'missing', 'other-store']) {
      await expect(
        sales.complete.execute(cashier('store-a'), {
          items: [{ productVariantId, quantity: 1 }],
          paymentMethod: 'CASH',
        })
      ).rejects.toBeInstanceOf(NotFoundError);
    }
  });

  it('validates checkout quantities and payment method', async () => {
    const sales = buildSalesHarness([variant({ id: 'variant-1', storeId: 'store-a', price: 10, stock: 2 })]);

    await expect(
      sales.complete.execute(cashier('store-a'), {
        items: [{ productVariantId: 'variant-1', quantity: 0 }],
        paymentMethod: 'CASH',
      })
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      sales.complete.execute(cashier('store-a'), {
        items: [{ productVariantId: 'variant-1', quantity: 1 }],
        paymentMethod: 'CRYPTO' as 'CASH',
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('scopes sale list and detail to the authenticated store', async () => {
    const sales = buildSalesHarness([
      variant({ id: 'variant-a', storeId: 'store-a', price: 10, stock: 2 }),
      variant({ id: 'variant-b', storeId: 'store-b', price: 20, stock: 2 }),
    ]);

    await sales.complete.execute(cashier('store-a'), {
      items: [{ productVariantId: 'variant-a', quantity: 1 }],
      paymentMethod: 'CASH',
    });
    await sales.complete.execute(cashier('store-b'), {
      items: [{ productVariantId: 'variant-b', quantity: 1 }],
      paymentMethod: 'CARD',
    });

    await expect(sales.list.execute(cashier('store-a'))).resolves.toEqual([
      expect.objectContaining({ id: 'sale-1', storeId: 'store-a' }),
    ]);
    await expect(sales.getById.execute(cashier('store-a'), 'sale-2')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('allows cashiers to complete and read sales but rejects unknown roles', async () => {
    const sales = buildSalesHarness([variant({ id: 'variant-1', storeId: 'store-a', price: 10, stock: 2 })]);

    await expect(
      sales.complete.execute(viewer('store-a'), {
        items: [{ productVariantId: 'variant-1', quantity: 1 }],
        paymentMethod: 'CASH',
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(sales.list.execute(viewer('store-a'))).rejects.toBeInstanceOf(ForbiddenError);
  });
});

interface VariantRecord {
  readonly id: string;
  readonly storeId: string;
  readonly price: number;
  readonly stock: number;
  readonly active: boolean;
}

class FakeCatalogGateway implements SalesCatalogGateway {
  constructor(private readonly variants: VariantRecord[]) {}

  async findActiveVariant(storeId: string, productVariantId: string) {
    const found = this.variants.find(
      (variant) => variant.storeId === storeId && variant.id === productVariantId && variant.active
    );
    return found ? { productVariantId: found.id, unitPrice: found.price } : undefined;
  }
}

class FakeInventoryGateway implements SalesInventoryGateway {
  readonly movements: Array<{
    storeId: string;
    productVariantId: string;
    type: 'SALE';
    quantity: number;
    previousStock: number;
    newStock: number;
    createdAt: Date;
  }> = [];

  constructor(private readonly variants: VariantRecord[]) {}

  async getStock(storeId: string, productVariantId: string): Promise<number | undefined> {
    return this.variants.find((variant) => variant.storeId === storeId && variant.id === productVariantId)?.stock;
  }

  async reduceStock(storeId: string, productVariantId: string, quantity: number, createdAt: Date): Promise<void> {
    const index = this.variants.findIndex((variant) => variant.storeId === storeId && variant.id === productVariantId);
    const variant = this.variants[index];
    this.variants[index] = { ...variant, stock: variant.stock - quantity };
    this.movements.push({
      storeId,
      productVariantId,
      type: 'SALE',
      quantity: -quantity,
      previousStock: variant.stock,
      newStock: variant.stock - quantity,
      createdAt,
    });
  }

  stockOf(storeId: string, productVariantId: string): number | undefined {
    return this.variants.find((variant) => variant.storeId === storeId && variant.id === productVariantId)?.stock;
  }

  snapshot(): { variants: VariantRecord[]; movementsLength: number } {
    return { variants: this.variants.map((variant) => ({ ...variant })), movementsLength: this.movements.length };
  }

  restore(snapshot: { variants: VariantRecord[]; movementsLength: number }): void {
    this.variants.splice(0, this.variants.length, ...snapshot.variants);
    this.movements.splice(snapshot.movementsLength);
  }
}

class FakeSaleRepository implements SaleRepository {
  readonly sales: SaleSnapshot[] = [];

  async save(sale: SaleSnapshot): Promise<void> {
    this.sales.push(sale);
  }

  async findById(storeId: string, saleId: string): Promise<SaleSnapshot | undefined> {
    return this.sales.find((sale) => sale.storeId === storeId && sale.id === saleId);
  }

  async list(storeId: string): Promise<SaleSnapshot[]> {
    return this.sales.filter((sale) => sale.storeId === storeId);
  }
}

class FakeTransactionManager implements CheckoutTransactionManager {
  constructor(
    private readonly sales: FakeSaleRepository,
    private readonly inventory: FakeInventoryGateway
  ) {}

  async execute<T>(work: () => Promise<T>): Promise<T> {
    const salesLength = this.sales.sales.length;
    const inventorySnapshot = this.inventory.snapshot();
    try {
      return await work();
    } catch (error) {
      this.sales.sales.splice(salesLength);
      this.inventory.restore(inventorySnapshot);
      throw error;
    }
  }
}

class SequentialSalesIdGenerator implements SalesIdGenerator {
  private sale = 0;

  nextId(scope: 'sale'): string {
    this.sale += 1;
    return `${scope}-${this.sale}`;
  }
}

function buildSalesHarness(variants: VariantRecord[]) {
  const catalog = new FakeCatalogGateway(variants);
  const inventory = new FakeInventoryGateway(variants);
  const repository = new FakeSaleRepository();
  const authorization = new RoleBasedSalesAuthorizationPolicy();
  const clock: SalesClock = { now: () => new Date('2026-01-01T00:00:00.000Z') };
  const transaction = new FakeTransactionManager(repository, inventory);
  const ids = new SequentialSalesIdGenerator();

  return {
    complete: new CompleteSaleHandler(catalog, inventory, repository, transaction, authorization, clock, ids),
    getById: new GetSaleByIdHandler(repository, authorization),
    list: new ListSalesHandler(repository, authorization),
    inventory,
  };
}

function variant(input: Omit<VariantRecord, 'active'> & { readonly active?: boolean }): VariantRecord {
  return { ...input, active: input.active ?? true };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'cashier', storeId, roles: ['CASHIER'] };
}

function viewer(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'viewer', storeId, roles: ['VIEWER'] };
}
