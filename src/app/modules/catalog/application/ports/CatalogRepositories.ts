import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import {
  ProductDiscoveryItemDto,
  SellableVariantDto,
} from '@src/app/modules/catalog/application/dtos/ProductDiscoveryDto';

export interface ListProductsFilter {
  readonly q?: string;
  readonly categoryId?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly active?: boolean;
}

export interface ListProductVariantsFilter {
  readonly q?: string;
  readonly productId?: string;
  readonly sku?: string;
  readonly barcode?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly active?: boolean;
  readonly lowStock?: boolean;
}

export interface ProductDiscoveryFilter {
  readonly q?: string;
  readonly categoryId?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface VariantDiscoveryFilter {
  readonly q?: string;
  readonly barcode?: string;
  readonly productId?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export type CatalogProductDiscoveryProjection = ProductDiscoveryItemDto;

export type CatalogVariantDiscoveryProjection = SellableVariantDto;

export interface CatalogDiscoveryPage<TItem> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CatalogDiscoveryReadRepository {
  discoverProducts(
    storeId: string,
    filter: ProductDiscoveryFilter
  ): Promise<CatalogDiscoveryPage<CatalogProductDiscoveryProjection>>;
  discoverVariants(
    storeId: string,
    filter: VariantDiscoveryFilter
  ): Promise<CatalogDiscoveryPage<CatalogVariantDiscoveryProjection>>;
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
