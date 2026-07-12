import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';

const storage = new AsyncLocalStorage<typeof db>();

export class CheckoutTransactionContext {
  static current(): typeof db {
    return storage.getStore() ?? db;
  }

  static async execute<T>(work: () => Promise<T>): Promise<T> {
    if (storage.getStore()) return work();
    return db.transaction(async (transaction) => storage.run(transaction as unknown as typeof db, work));
  }
}
