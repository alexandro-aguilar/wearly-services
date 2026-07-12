import { CheckoutTransactionManager } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';

export class DrizzleCheckoutTransactionManager implements CheckoutTransactionManager {
  constructor(private readonly database: typeof db = db) {}

  async execute<T>(work: () => Promise<T>): Promise<T> {
    return this.database.transaction(async () => work());
  }
}
