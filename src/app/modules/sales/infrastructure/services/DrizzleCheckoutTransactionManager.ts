import { CheckoutTransactionManager } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';

export class DrizzleCheckoutTransactionManager implements CheckoutTransactionManager {
  async execute<T>(work: () => Promise<T>): Promise<T> {
    return CheckoutTransactionContext.execute(work);
  }
}
