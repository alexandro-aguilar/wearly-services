import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';
import { saleItems, sales } from '@src/app/core/infrastructure/database/schema';
import { SaleRepository } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';

export class DrizzleSaleRepository implements SaleRepository {
  constructor(private readonly override?: typeof db) {}
  private get database(): typeof db {
    return this.override ?? CheckoutTransactionContext.current();
  }
  async save(sale: SaleSnapshot): Promise<void> {
    await this.database.insert(sales).values({
      id: sale.id,
      storeId: sale.storeId,
      customerId: sale.customerId,
      subtotal: sale.subtotal.toFixed(2),
      discount: sale.discount.toFixed(2),
      tax: sale.tax.toFixed(2),
      total: sale.total.toFixed(2),
      paymentMethod: sale.paymentMethod,
      paymentReference: sale.paymentReference,
      status: sale.status,
      createdAt: sale.createdAt,
    });
    await this.database.insert(saleItems).values(
      sale.items.map((item) => ({
        id: randomUUID(),
        saleId: sale.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        discount: item.discount.toFixed(2),
        total: item.total.toFixed(2),
      }))
    );
  }
  async findById(storeId: string, saleId: string): Promise<SaleSnapshot | undefined> {
    const [sale] = await this.database
      .select()
      .from(sales)
      .where(and(eq(sales.storeId, storeId), eq(sales.id, saleId)))
      .limit(1);
    if (!sale) return undefined;
    const items = await this.database.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    return {
      id: sale.id,
      storeId: sale.storeId,
      customerId: sale.customerId ?? undefined,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      tax: Number(sale.tax),
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod as SaleSnapshot['paymentMethod'],
      paymentReference: sale.paymentReference ?? undefined,
      status: sale.status as SaleSnapshot['status'],
      createdAt: sale.createdAt,
      items: items.map((item) => ({
        saleId: sale.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
      })),
    };
  }
  async list(storeId: string): Promise<SaleSnapshot[]> {
    const rows = await this.database
      .select({ id: sales.id })
      .from(sales)
      .where(eq(sales.storeId, storeId))
      .orderBy(desc(sales.createdAt));
    return (await Promise.all(rows.map((row) => this.findById(storeId, row.id)))).filter(
      (sale): sale is SaleSnapshot => sale !== undefined
    );
  }
}
