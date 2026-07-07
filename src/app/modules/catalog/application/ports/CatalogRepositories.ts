import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';

export interface ListProductsFilter {
  readonly active?: boolean;
}

export interface ListProductVariantsFilter {
  readonly productId?: string;
  readonly sku?: string;
  readonly barcode?: string;
  readonly active?: boolean;
  readonly lowStock?: boolean;
}

export interface ProductRepository {
  findById(storeId: string, id: string): Promise<ProductSnapshot | undefined>;
  list(storeId: string, filter: ListProductsFilter): Promise<ProductSnapshot[]>;
  save(product: ProductSnapshot): Promise<void>;
}

export interface ProductVariantRepository {
  findById(storeId: string, id: string): Promise<ProductVariantSnapshot | undefined>;
  list(storeId: string, filter: ListProductVariantsFilter): Promise<ProductVariantSnapshot[]>;
  save(variant: ProductVariantSnapshot): Promise<void>;
  skuExists(storeId: string, sku: string, excludingVariantId?: string): Promise<boolean>;
  barcodeExists(storeId: string, barcode: string, excludingVariantId?: string): Promise<boolean>;
}
