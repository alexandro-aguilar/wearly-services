import {
  CatalogDiscoveryPage,
  CatalogDiscoveryReadRepository,
  CatalogProductDiscoveryProjection,
  CatalogVariantDiscoveryProjection,
  ProductDiscoveryFilter,
  VariantDiscoveryFilter,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { InMemoryCatalogStore } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';

export class InMemoryCatalogDiscoveryRepository implements CatalogDiscoveryReadRepository {
  constructor(private readonly store: InMemoryCatalogStore) {}

  async discoverProducts(
    storeId: string,
    filter: ProductDiscoveryFilter
  ): Promise<CatalogDiscoveryPage<CatalogProductDiscoveryProjection>> {
    const query = normalized(filter.q);
    const matching = [...this.store.products.values()]
      .filter((product) => product.storeId === storeId)
      .filter((product) => filter.categoryId === undefined || product.categoryId === filter.categoryId)
      .filter((product) => !query || normalized(product.name).includes(query))
      .sort(compareByNameThenId)
      .map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        active: product.active,
      }));

    return page(matching, filter);
  }

  async discoverVariants(
    storeId: string,
    filter: VariantDiscoveryFilter
  ): Promise<CatalogDiscoveryPage<CatalogVariantDiscoveryProjection>> {
    const products = new Map(
      [...this.store.products.values()]
        .filter((product) => product.storeId === storeId)
        .map((product) => [product.id, product])
    );
    const query = normalized(filter.q);
    const matching = [...this.store.variants.values()]
      .filter((variant) => variant.storeId === storeId)
      .filter((variant) => filter.productId === undefined || variant.productId === filter.productId)
      .filter((variant) => filter.barcode === undefined || variant.barcode === filter.barcode)
      .map((variant) => ({ variant, product: products.get(variant.productId) }))
      .filter(
        (entry): entry is typeof entry & { product: NonNullable<typeof entry.product> } => entry.product !== undefined
      )
      .filter(
        ({ variant, product }) =>
          !query ||
          normalized(product.name).includes(query) ||
          normalized(variant.sku).includes(query) ||
          normalized(variant.barcode).includes(query)
      )
      .sort((left, right) => left.variant.id.localeCompare(right.variant.id))
      .map(({ variant, product }) => ({
        id: variant.id,
        productId: variant.productId,
        productName: product.name,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price.toFixed(2),
        stock: variant.stock,
        stockStatus: stockStatus(variant.active, product.active, variant.stock, variant.minimumStock),
        active: variant.active,
      }));

    return page(matching, filter);
  }
}

function stockStatus(
  variantActive: boolean,
  productActive: boolean,
  stock: number,
  minimumStock: number
): CatalogVariantDiscoveryProjection['stockStatus'] {
  if (!variantActive || !productActive) return 'UNAVAILABLE';
  if (stock === 0) return 'OUT_OF_STOCK';
  if (stock <= minimumStock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function page<TItem>(
  items: readonly TItem[],
  filter: { readonly page?: number; readonly pageSize?: number }
): CatalogDiscoveryPage<TItem> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

function normalized(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function compareByNameThenId(
  left: { readonly name: string; readonly id: string },
  right: { readonly name: string; readonly id: string }
): number {
  return normalized(left.name).localeCompare(normalized(right.name)) || left.id.localeCompare(right.id);
}
