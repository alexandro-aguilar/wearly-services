import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import * as schema from '@src/app/core/infrastructure/database/schema';
import {
  CatalogDiscoveryPage,
  CatalogDiscoveryReadRepository,
  CatalogProductDiscoveryProjection,
  CatalogVariantDiscoveryProjection,
  ProductDiscoveryFilter,
  VariantDiscoveryFilter,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';

export class DrizzleCatalogDiscoveryRepository implements CatalogDiscoveryReadRepository {
  constructor(private readonly database: typeof db = db) {}

  async discoverProducts(
    storeId: string,
    filter: ProductDiscoveryFilter
  ): Promise<CatalogDiscoveryPage<CatalogProductDiscoveryProjection>> {
    const where = and(
      eq(schema.products.storeId, storeId),
      filter.categoryId === undefined ? undefined : eq(schema.products.categoryId, filter.categoryId),
      filter.q === undefined || !filter.q.trim() ? undefined : ilike(schema.products.name, likePattern(filter.q))
    );
    const { page, pageSize, offset } = pagination(filter);
    const [rows, [{ total }]] = await Promise.all([
      this.database
        .select({
          id: schema.products.id,
          name: schema.products.name,
          categoryId: schema.products.categoryId,
          active: schema.products.active,
        })
        .from(schema.products)
        .where(where)
        .orderBy(asc(schema.products.name), asc(schema.products.id))
        .limit(pageSize)
        .offset(offset),
      this.database.select({ total: count() }).from(schema.products).where(where),
    ]);

    return {
      items: rows,
      page,
      pageSize,
      total: Number(total),
    };
  }

  async discoverVariants(
    storeId: string,
    filter: VariantDiscoveryFilter
  ): Promise<CatalogDiscoveryPage<CatalogVariantDiscoveryProjection>> {
    const query = filter.q?.trim();
    const where = and(
      eq(schema.productVariants.storeId, storeId),
      eq(schema.products.storeId, storeId),
      filter.productId === undefined ? undefined : eq(schema.productVariants.productId, filter.productId),
      filter.barcode === undefined ? undefined : eq(schema.productVariants.barcode, filter.barcode),
      !query
        ? undefined
        : or(
            ilike(schema.products.name, likePattern(query)),
            ilike(schema.productVariants.sku, likePattern(query)),
            ilike(schema.productVariants.barcode, likePattern(query))
          )
    );
    const { page, pageSize, offset } = pagination(filter);
    const [rows, [{ total }]] = await Promise.all([
      this.database
        .select({
          id: schema.productVariants.id,
          productId: schema.productVariants.productId,
          productName: schema.products.name,
          sku: schema.productVariants.sku,
          barcode: schema.productVariants.barcode,
          price: schema.productVariants.price,
          stock: schema.productVariants.stock,
          minimumStock: schema.productVariants.minimumStock,
          variantActive: schema.productVariants.active,
          productActive: schema.products.active,
        })
        .from(schema.productVariants)
        .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
        .where(where)
        .orderBy(asc(schema.productVariants.id))
        .limit(pageSize)
        .offset(offset),
      this.database
        .select({ total: count() })
        .from(schema.productVariants)
        .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
        .where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        barcode: row.barcode ?? undefined,
        price: Number(row.price).toFixed(2),
        stock: row.stock,
        stockStatus: stockStatus(row.variantActive, row.productActive, row.stock, row.minimumStock),
        active: row.variantActive,
      })),
      page,
      pageSize,
      total: Number(total),
    };
  }
}

function pagination(filter: { readonly page?: number; readonly pageSize?: number }) {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function likePattern(value: string): string {
  return `%${value.trim()}%`;
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
