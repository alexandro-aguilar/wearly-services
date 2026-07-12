import {
  ListProductVariantsFilter,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import {
  cloneVariant,
  inMemoryCatalogKey,
  InMemoryCatalogStore,
} from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';

export class InMemoryProductVariantRepository implements ProductVariantRepository {
  constructor(private readonly store: InMemoryCatalogStore) {}

  async findById(storeId: string, id: string): Promise<ProductVariantSnapshot | undefined> {
    return cloneVariant(this.store.variants.get(inMemoryCatalogKey(storeId, id)));
  }

  async list(storeId: string, filter: ListProductVariantsFilter): Promise<ProductVariantSnapshot[]> {
    const query = filter.q?.trim().toLocaleLowerCase();
    const variants = [...this.store.variants.values()]
      .filter((variant) => variant.storeId === storeId)
      .filter((variant) => filter.productId === undefined || variant.productId === filter.productId)
      .filter((variant) => filter.sku === undefined || variant.sku === filter.sku)
      .filter((variant) => filter.barcode === undefined || variant.barcode === filter.barcode)
      .filter(
        (variant) =>
          !query ||
          variant.sku.toLocaleLowerCase().includes(query) ||
          variant.barcode?.toLocaleLowerCase().includes(query)
      )
      .filter((variant) => filter.active === undefined || variant.active === filter.active)
      .filter((variant) => filter.lowStock === undefined || filter.lowStock === variant.stock <= variant.minimumStock)
      .sort((left, right) => left.id.localeCompare(right.id));

    return paginate(variants, filter).map((variant) => cloneVariant(variant));
  }

  async save(variant: ProductVariantSnapshot): Promise<void> {
    this.store.variants.set(inMemoryCatalogKey(variant.storeId, variant.id), cloneVariant(variant));
  }

  async skuExists(storeId: string, sku: string, excludingVariantId?: string): Promise<boolean> {
    return [...this.store.variants.values()].some(
      (variant) => variant.storeId === storeId && variant.sku === sku && variant.id !== excludingVariantId
    );
  }

  async barcodeExists(storeId: string, barcode: string, excludingVariantId?: string): Promise<boolean> {
    return [...this.store.variants.values()].some(
      (variant) => variant.storeId === storeId && variant.barcode === barcode && variant.id !== excludingVariantId
    );
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
