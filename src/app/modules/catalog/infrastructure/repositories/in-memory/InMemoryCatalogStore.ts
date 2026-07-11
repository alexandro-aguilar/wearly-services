import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';

export class InMemoryCatalogStore {
  readonly products = new Map<string, ProductSnapshot>();
  readonly variants = new Map<string, ProductVariantSnapshot>();
}

export function inMemoryCatalogKey(storeId: string, id: string): string {
  return `${storeId}:${id}`;
}

export function cloneProduct(product: ProductSnapshot): ProductSnapshot;
export function cloneProduct(product: ProductSnapshot | undefined): ProductSnapshot | undefined;
export function cloneProduct(product: ProductSnapshot | undefined): ProductSnapshot | undefined {
  if (!product) {
    return undefined;
  }

  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt),
  };
}

export function cloneVariant(variant: ProductVariantSnapshot): ProductVariantSnapshot;
export function cloneVariant(variant: ProductVariantSnapshot | undefined): ProductVariantSnapshot | undefined;
export function cloneVariant(variant: ProductVariantSnapshot | undefined): ProductVariantSnapshot | undefined {
  if (!variant) {
    return undefined;
  }

  return {
    ...variant,
    createdAt: new Date(variant.createdAt),
    updatedAt: new Date(variant.updatedAt),
  };
}
