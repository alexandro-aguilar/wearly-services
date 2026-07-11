import { InMemoryCatalogStore } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';
import { InMemoryInventoryMovementRepository } from '@src/app/modules/inventory/infrastructure/repositories/in-memory/InMemoryInventoryMovementRepository';
import { CheckoutTransactionManager } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { InMemorySaleRepository } from '@src/app/modules/sales/infrastructure/repositories/in-memory/InMemorySaleRepository';

export class InMemoryCheckoutTransactionManager implements CheckoutTransactionManager {
  constructor(
    private readonly catalog: InMemoryCatalogStore,
    private readonly inventoryMovements: InMemoryInventoryMovementRepository,
    private readonly sales: InMemorySaleRepository
  ) {}

  async execute<T>(work: () => Promise<T>): Promise<T> {
    const variants = new Map(this.catalog.variants);
    const movements = this.inventoryMovements.checkpoint();
    const sales = this.sales.checkpoint();
    try {
      return await work();
    } catch (error) {
      this.catalog.variants.clear();
      for (const [key, variant] of variants) {
        this.catalog.variants.set(key, variant);
      }
      this.inventoryMovements.restore(movements);
      this.sales.restore(sales);
      throw error;
    }
  }
}
