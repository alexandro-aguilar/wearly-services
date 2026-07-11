import { ListProductsFilter, ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import {
  cloneProduct,
  inMemoryCatalogKey,
  InMemoryCatalogStore,
} from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly store: InMemoryCatalogStore) {}

  async findById(storeId: string, id: string): Promise<ProductSnapshot | undefined> {
    return cloneProduct(this.store.products.get(inMemoryCatalogKey(storeId, id)));
  }

  async list(storeId: string, filter: ListProductsFilter): Promise<ProductSnapshot[]> {
    return [...this.store.products.values()]
      .filter((product) => product.storeId === storeId)
      .filter((product) => filter.active === undefined || product.active === filter.active)
      .map((product) => cloneProduct(product));
  }

  async save(product: ProductSnapshot): Promise<void> {
    this.store.products.set(inMemoryCatalogKey(product.storeId, product.id), cloneProduct(product));
  }
}
