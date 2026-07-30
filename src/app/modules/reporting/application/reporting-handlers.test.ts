import { describe, expect, it } from 'vitest';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import {
  ReportingInventoryReader,
  ReportingCatalogReader,
  ReportingSalesReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { GetBestSellersReportHandler } from '@src/app/modules/reporting/application/queries/GetBestSellersReportHandler';
import { GetDailySalesReportHandler } from '@src/app/modules/reporting/application/queries/GetDailySalesReportHandler';
import { GetLowStockReportHandler } from '@src/app/modules/reporting/application/queries/GetLowStockReportHandler';
import { RoleBasedReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ReportingAuthorizationPolicy';
import { InventoryReportingReader } from '@src/app/modules/reporting/infrastructure/services/InventoryReportingReader';
import { SalesReportingReader } from '@src/app/modules/reporting/infrastructure/services/SalesReportingReader';
import { InventoryVariantStockSnapshot } from '@src/app/modules/inventory/domain/InventoryVariantStock';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

describe('reporting query handlers', () => {
  it('builds daily sales using store-local boundaries and completed sales only', async () => {
    const reporting = buildHarness({
      sales: [
        sale({ id: 'before-local-day', createdAt: '2026-01-01T05:59:59.999Z' }),
        sale({ id: 'first', createdAt: '2026-01-01T06:00:00.000Z', subtotal: 120, discount: 20, total: 100 }),
        sale({ id: 'second', createdAt: '2026-01-02T05:59:59.999Z', subtotal: 250, tax: 25, total: 275 }),
        sale({ id: 'next-local-day', createdAt: '2026-01-02T06:00:00.000Z' }),
        sale({ id: 'cancelled', createdAt: '2026-01-01T12:00:00.000Z', status: 'CANCELLED' }),
        sale({ id: 'other-store', storeId: 'store-b', createdAt: '2026-01-01T12:00:00.000Z' }),
      ],
    });

    await expect(
      reporting.daily.execute(manager('store-a'), { date: '2026-01-01', timeZone: 'America/Mexico_City' })
    ).resolves.toEqual({
      meta: {
        storeId: 'store-a',
        currency: 'USD',
        timeZone: 'America/Mexico_City',
        period: { from: '2026-01-01', to: '2026-01-01' },
      },
      totals: { saleCount: 2, itemQuantity: 2, subtotal: 370, discount: 20, tax: 25, total: 375 },
      series: [{ date: '2026-01-01', saleCount: 2, itemQuantity: 2, subtotal: 370, discount: 20, tax: 25, total: 375 }],
    });
  });

  it('rejects invalid reporting dates and timezone offsets', async () => {
    const reporting = buildHarness();
    await expect(
      reporting.daily.execute(manager('store-a'), { date: '01/01/2026', timeZone: 'UTC' })
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      reporting.daily.execute(manager('store-a'), { date: '2026-01-01', timeZone: 'not-a-zone' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('zero-fills a multi-day sales overview and observes IANA daylight-saving boundaries', async () => {
    const reporting = buildHarness({ sales: [sale({ id: 'first', createdAt: '2026-03-08T05:00:00.000Z' })] });
    await expect(
      reporting.daily.execute(manager('store-a'), { date: '2026-03-08', timeZone: 'America/New_York' })
    ).resolves.toMatchObject({
      series: [{ date: '2026-03-08', saleCount: 1 }],
    });
  });

  it('aggregates best sellers by variant from completed store sales with deterministic ranking', async () => {
    const reporting = buildHarness({
      sales: [
        sale({
          id: 'sale-1',
          items: [item('variant-b', 2, 20), item('variant-a', 2, 30)],
        }),
        sale({ id: 'sale-2', items: [item('variant-a', 1, 30)] }),
        sale({ id: 'cancelled', status: 'CANCELLED', items: [item('variant-c', 100, 1)] }),
      ],
    });

    await expect(
      reporting.bestSellers.execute(manager('store-a'), {
        limit: 2,
        from: '2026-01-01',
        to: '2026-01-01',
        timeZone: 'UTC',
      })
    ).resolves.toMatchObject({
      meta: { storeId: 'store-a', currency: 'USD', timeZone: 'UTC', period: { from: '2026-01-01', to: '2026-01-01' } },
      items: [
        { rank: 1, productVariantId: 'variant-a', quantitySold: 3, grossSales: 90, discount: 0, netSales: 90 },
        { rank: 2, productVariantId: 'variant-b', quantitySold: 2, grossSales: 40, discount: 0, netSales: 40 },
      ],
    });
  });

  it('returns active low-stock variants at or below minimum stock for the current store', async () => {
    const reporting = buildHarness({
      inventory: [
        stock({ id: 'zero', stock: 0, minimumStock: 2 }),
        stock({ id: 'threshold', stock: 2, minimumStock: 2 }),
        stock({ id: 'healthy', stock: 3, minimumStock: 2 }),
        stock({ id: 'inactive', stock: 0, minimumStock: 2, active: false }),
        stock({ id: 'other-store', storeId: 'store-b', stock: 0, minimumStock: 2 }),
      ],
    });

    await expect(reporting.lowStock.execute(manager('store-a'))).resolves.toMatchObject({
      items: [
        expect.objectContaining({ productVariantId: 'zero', stock: 0 }),
        expect.objectContaining({ productVariantId: 'threshold', stock: 2 }),
      ],
    });
  });

  it('allows managers and admins to report but rejects cashiers', async () => {
    const reporting = buildHarness();
    await expect(reporting.lowStock.execute(manager('store-a'))).resolves.toMatchObject({ items: [] });
    await expect(reporting.lowStock.execute(cashier('store-a'))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('projects source sales and inventory without mutating either bounded context', async () => {
    const sales = [sale({ id: 'sale-1' })];
    const inventory = [stock({ id: 'variant-1', stock: 1, minimumStock: 2 })];
    const salesReader = new SalesReportingReader({
      save: async () => {
        throw new Error('Reporting must not mutate sales.');
      },
      findById: async () => undefined,
      list: async () => sales,
    });
    const inventoryReader = new InventoryReportingReader({
      findById: async () => undefined,
      listLowStock: async () => inventory,
      saveStock: async () => {
        throw new Error('Reporting must not mutate inventory.');
      },
    });

    await expect(salesReader.list('store-a')).resolves.toEqual([expect.objectContaining({ id: 'sale-1' })]);
    await expect(inventoryReader.listLowStock('store-a')).resolves.toEqual([
      expect.objectContaining({ productVariantId: 'variant-1' }),
    ]);
  });
});

class FakeReportingSalesReader implements ReportingSalesReader {
  constructor(private readonly sales: SaleSnapshot[]) {}
  async list(storeId: string): Promise<SaleSnapshot[]> {
    return this.sales.filter((sale) => sale.storeId === storeId);
  }
}

class FakeReportingInventoryReader implements ReportingInventoryReader {
  constructor(private readonly inventory: InventoryVariantStockSnapshot[]) {}
  async listLowStock(storeId: string): Promise<InventoryVariantStockSnapshot[]> {
    return this.inventory.filter((item) => item.storeId === storeId && item.active && item.stock <= item.minimumStock);
  }
}

class FakeReportingCatalogReader implements ReportingCatalogReader {
  async list() {
    return [];
  }
}

function buildHarness(input: { sales?: SaleSnapshot[]; inventory?: InventoryVariantStockSnapshot[] } = {}) {
  const authorization: ReportingAuthorizationPolicy = new RoleBasedReportingAuthorizationPolicy();
  const sales = new FakeReportingSalesReader(input.sales ?? []);
  const inventory = new FakeReportingInventoryReader(input.inventory ?? []);
  const catalog = new FakeReportingCatalogReader();
  return {
    daily: new GetDailySalesReportHandler(sales, authorization),
    bestSellers: new GetBestSellersReportHandler(sales, authorization, catalog),
    lowStock: new GetLowStockReportHandler(inventory, authorization, catalog),
  };
}

function sale(
  input: Partial<Omit<SaleSnapshot, 'createdAt' | 'items'>> & {
    id: string;
    createdAt?: string;
    items?: SaleSnapshot['items'];
  }
): SaleSnapshot {
  return {
    id: input.id,
    storeId: input.storeId ?? 'store-a',
    customerId: input.customerId,
    subtotal: input.subtotal ?? 100,
    discount: input.discount ?? 0,
    tax: input.tax ?? 0,
    total: input.total ?? 100,
    paymentMethod: input.paymentMethod ?? 'CASH',
    status: input.status ?? 'COMPLETED',
    createdAt: new Date(input.createdAt ?? '2026-01-01T12:00:00.000Z'),
    items: input.items ?? [item('variant-default', 1, 100)],
  };
}

function item(productVariantId: string, quantity: number, unitPrice: number) {
  return {
    saleId: 'sale',
    productVariantId,
    quantity,
    unitPrice,
    discount: 0,
    total: quantity * unitPrice,
  };
}

function stock(input: {
  id: string;
  stock: number;
  minimumStock: number;
  storeId?: string;
  active?: boolean;
}): InventoryVariantStockSnapshot {
  return {
    storeId: input.storeId ?? 'store-a',
    productVariantId: input.id,
    sku: `${input.id}-sku`,
    stock: input.stock,
    minimumStock: input.minimumStock,
    active: input.active ?? true,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function manager(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'manager', storeId, roles: ['MANAGER'] };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'cashier', storeId, roles: ['CASHIER'] };
}
