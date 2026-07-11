import { SaleRepository } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { cloneSale, SaleSnapshot } from '@src/app/modules/sales/domain/Sale';

export const sharedInMemorySalesStore = new Map<string, SaleSnapshot>();

export class InMemorySaleRepository implements SaleRepository {
  constructor(private readonly sales: Map<string, SaleSnapshot> = sharedInMemorySalesStore) {}

  async save(sale: SaleSnapshot): Promise<void> {
    this.sales.set(key(sale.storeId, sale.id), cloneSale(sale));
  }

  async findById(storeId: string, saleId: string): Promise<SaleSnapshot | undefined> {
    const sale = this.sales.get(key(storeId, saleId));
    return sale ? cloneSale(sale) : undefined;
  }

  async list(storeId: string): Promise<SaleSnapshot[]> {
    return [...this.sales.values()]
      .filter((sale) => sale.storeId === storeId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((sale) => cloneSale(sale));
  }

  checkpoint(): SaleSnapshot[] {
    return [...this.sales.values()].map((sale) => cloneSale(sale));
  }

  restore(checkpoint: readonly SaleSnapshot[]): void {
    this.sales.clear();
    for (const sale of checkpoint) {
      this.sales.set(key(sale.storeId, sale.id), cloneSale(sale));
    }
  }
}

function key(storeId: string, saleId: string): string {
  return `${storeId}:${saleId}`;
}
