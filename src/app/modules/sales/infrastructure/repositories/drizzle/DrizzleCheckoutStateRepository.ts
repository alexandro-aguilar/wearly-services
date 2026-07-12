import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { checkoutQuotes, saleIdempotency } from '@src/app/core/infrastructure/database/schema';
import {
  CheckoutQuoteRepository,
  SaleIdempotencyRecord,
  SaleIdempotencyRepository,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { CheckoutQuoteSnapshot } from '@src/app/modules/sales/domain/CheckoutQuote';

export class DrizzleCheckoutQuoteRepository implements CheckoutQuoteRepository {
  constructor(private readonly database: typeof db = db) {}
  async save(quote: CheckoutQuoteSnapshot): Promise<void> {
    await this.database
      .insert(checkoutQuotes)
      .values({
        id: quote.id,
        storeId: quote.storeId,
        subjectId: quote.subjectId,
        snapshot: quote as never,
        expiresAt: quote.expiresAt,
      })
      .onConflictDoUpdate({
        target: checkoutQuotes.id,
        set: { snapshot: quote as never, expiresAt: quote.expiresAt, updatedAt: new Date() },
      });
  }
  async findById(storeId: string, quoteId: string): Promise<CheckoutQuoteSnapshot | undefined> {
    const [row] = await this.database
      .select({ snapshot: checkoutQuotes.snapshot })
      .from(checkoutQuotes)
      .where(and(eq(checkoutQuotes.storeId, storeId), eq(checkoutQuotes.id, quoteId)))
      .limit(1);
    return row?.snapshot as CheckoutQuoteSnapshot | undefined;
  }
}

export class DrizzleSaleIdempotencyRepository implements SaleIdempotencyRepository {
  constructor(private readonly database: typeof db = db) {}
  async find(storeId: string, key: string): Promise<SaleIdempotencyRecord | undefined> {
    const [row] = await this.database
      .select()
      .from(saleIdempotency)
      .where(and(eq(saleIdempotency.storeId, storeId), eq(saleIdempotency.idempotencyKey, key)))
      .limit(1);
    return row
      ? {
          storeId: row.storeId,
          key: row.idempotencyKey,
          fingerprint: row.requestFingerprint,
          status: row.status as SaleIdempotencyRecord['status'],
          saleId: row.saleId ?? undefined,
        }
      : undefined;
  }
  async save(record: SaleIdempotencyRecord): Promise<void> {
    await this.database
      .insert(saleIdempotency)
      .values({
        id: randomUUID(),
        storeId: record.storeId,
        idempotencyKey: record.key,
        requestFingerprint: record.fingerprint,
        status: record.status,
        saleId: record.saleId,
      })
      .onConflictDoUpdate({
        target: [saleIdempotency.storeId, saleIdempotency.idempotencyKey],
        set: { status: record.status, saleId: record.saleId, updatedAt: new Date() },
      });
  }
}
