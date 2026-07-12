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
    const query = filter.q?.trim().toLocaleLowerCase();
    const products = [...this.store.products.values()]
      .filter((product) => product.storeId === storeId)
      .filter((product) => filter.categoryId === undefined || product.categoryId === filter.categoryId)
      .filter((product) => !query || product.name.toLocaleLowerCase().includes(query))
      .filter((product) => filter.active === undefined || product.active === filter.active)
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));

    return paginate(products, filter).map((product) => cloneProduct(product));
  }

  async save(product: ProductSnapshot): Promise<void> {
    this.store.products.set(inMemoryCatalogKey(product.storeId, product.id), cloneProduct(product));
  }
}

function paginate<TItem>(
  items: readonly TItem[],
  filter: { readonly page?: number; readonly pageSize?: number }
): readonly TItem[] {
  if (filter.page === undefined && filter.pageSize === undefined) return items;
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  return items.slice((page - 1) * pageSize, page * pageSize);
}
