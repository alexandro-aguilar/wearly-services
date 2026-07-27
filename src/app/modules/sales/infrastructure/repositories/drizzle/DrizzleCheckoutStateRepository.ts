import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';
import { checkoutQuotes, saleIdempotency } from '@src/app/core/infrastructure/database/schema';
import {
  CheckoutQuoteRepository,
  SaleIdempotencyRecord,
  SaleIdempotencyRepository,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { CheckoutQuoteSnapshot } from '@src/app/modules/sales/domain/CheckoutQuote';

export class DrizzleCheckoutQuoteRepository implements CheckoutQuoteRepository {
  constructor(private readonly override?: typeof db) {}
  private get database(): typeof db {
    return this.override ?? CheckoutTransactionContext.current();
  }
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
    if (!row) return undefined;
    const snapshot = row.snapshot as CheckoutQuoteSnapshot & { expiresAt: Date | string };
    return {
      ...snapshot,
      expiresAt: snapshot.expiresAt instanceof Date ? snapshot.expiresAt : new Date(snapshot.expiresAt),
    };
  }
}

export class DrizzleSaleIdempotencyRepository implements SaleIdempotencyRepository {
  constructor(private readonly override?: typeof db) {}
  private get database(): typeof db {
    return this.override ?? CheckoutTransactionContext.current();
  }
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
  async findBySaleId(storeId: string, saleId: string): Promise<SaleIdempotencyRecord | undefined> {
    const [row] = await this.database
      .select()
      .from(saleIdempotency)
      .where(and(eq(saleIdempotency.storeId, storeId), eq(saleIdempotency.saleId, saleId)))
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
  async claim(record: SaleIdempotencyRecord): Promise<{ claimed: boolean; record: SaleIdempotencyRecord }> {
    const [created] = await this.database
      .insert(saleIdempotency)
      .values({
        id: randomUUID(),
        storeId: record.storeId,
        idempotencyKey: record.key,
        requestFingerprint: record.fingerprint,
        status: record.status,
        saleId: record.saleId,
      })
      .onConflictDoNothing()
      .returning({ idempotencyKey: saleIdempotency.idempotencyKey });
    if (created) return { claimed: true, record };
    const [reclaimed] = await this.database
      .update(saleIdempotency)
      .set({ status: 'PENDING', saleId: null, updatedAt: new Date() })
      .where(
        and(
          eq(saleIdempotency.storeId, record.storeId),
          eq(saleIdempotency.idempotencyKey, record.key),
          eq(saleIdempotency.status, 'FAILED')
        )
      )
      .returning({ idempotencyKey: saleIdempotency.idempotencyKey });
    if (reclaimed) return { claimed: true, record };
    const existing = await this.find(record.storeId, record.key);
    if (!existing) throw new Error('Unable to claim idempotency key.');
    return { claimed: false, record: existing };
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
