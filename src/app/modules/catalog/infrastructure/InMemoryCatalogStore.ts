import {
  ListProductVariantsFilter,
  ListProductsFilter,
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';

export class InMemoryCatalogStore {
  readonly products = new Map<string, ProductSnapshot>();
  readonly variants = new Map<string, ProductVariantSnapshot>();
}

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly store: InMemoryCatalogStore) {}

  async findById(storeId: string, id: string): Promise<ProductSnapshot | undefined> {
    return cloneProduct(this.store.products.get(key(storeId, id)));
  }

  async list(storeId: string, filter: ListProductsFilter): Promise<ProductSnapshot[]> {
    return [...this.store.products.values()]
      .filter((product) => product.storeId === storeId)
      .filter((product) => filter.active === undefined || product.active === filter.active)
      .map((product) => cloneProduct(product));
  }

  async save(product: ProductSnapshot): Promise<void> {
    this.store.products.set(key(product.storeId, product.id), cloneProduct(product));
  }
}

export class InMemoryProductVariantRepository implements ProductVariantRepository {
  constructor(private readonly store: InMemoryCatalogStore) {}

  async findById(storeId: string, id: string): Promise<ProductVariantSnapshot | undefined> {
    return cloneVariant(this.store.variants.get(key(storeId, id)));
  }

  async list(storeId: string, filter: ListProductVariantsFilter): Promise<ProductVariantSnapshot[]> {
    return [...this.store.variants.values()]
      .filter((variant) => variant.storeId === storeId)
      .filter((variant) => filter.productId === undefined || variant.productId === filter.productId)
      .filter((variant) => filter.sku === undefined || variant.sku === filter.sku)
      .filter((variant) => filter.barcode === undefined || variant.barcode === filter.barcode)
      .filter((variant) => filter.active === undefined || variant.active === filter.active)
      .filter((variant) => filter.lowStock === undefined || filter.lowStock === variant.stock <= variant.minimumStock)
      .map((variant) => cloneVariant(variant));
  }

  async save(variant: ProductVariantSnapshot): Promise<void> {
    this.store.variants.set(key(variant.storeId, variant.id), cloneVariant(variant));
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

function key(storeId: string, id: string): string {
  return `${storeId}:${id}`;
}

function cloneProduct(product: ProductSnapshot): ProductSnapshot;
function cloneProduct(product: ProductSnapshot | undefined): ProductSnapshot | undefined;
function cloneProduct(product: ProductSnapshot | undefined): ProductSnapshot | undefined {
  if (!product) {
    return undefined;
  }

  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt),
  };
}

function cloneVariant(variant: ProductVariantSnapshot): ProductVariantSnapshot;
function cloneVariant(variant: ProductVariantSnapshot | undefined): ProductVariantSnapshot | undefined;
function cloneVariant(variant: ProductVariantSnapshot | undefined): ProductVariantSnapshot | undefined {
  if (!variant) {
    return undefined;
  }

  return {
    ...variant,
    createdAt: new Date(variant.createdAt),
    updatedAt: new Date(variant.updatedAt),
  };
}
