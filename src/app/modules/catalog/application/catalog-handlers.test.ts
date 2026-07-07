import { describe, expect, it } from 'vitest';
import { RoleBasedCatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/CatalogAuthorizationPolicy';
import { IdGenerator } from '@src/app/modules/catalog/application/IdGenerator';
import { CreateProductHandler } from '@src/app/modules/catalog/application/commands/CreateProductHandler';
import { CreateProductVariantHandler } from '@src/app/modules/catalog/application/commands/CreateProductVariantHandler';
import { DeactivateProductHandler } from '@src/app/modules/catalog/application/commands/DeactivateProductHandler';
import { GetProductByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductByIdHandler';
import { GetProductVariantByIdHandler } from '@src/app/modules/catalog/application/queries/GetProductVariantByIdHandler';
import { ListProductsHandler } from '@src/app/modules/catalog/application/queries/ListProductsHandler';
import { ListProductVariantsHandler } from '@src/app/modules/catalog/application/queries/ListProductVariantsHandler';
import { UpdateProductVariantHandler } from '@src/app/modules/catalog/application/commands/UpdateProductVariantHandler';
import {
  InMemoryCatalogStore,
  InMemoryProductRepository,
  InMemoryProductVariantRepository,
} from '@src/app/modules/catalog/infrastructure/InMemoryCatalogStore';
import { Clock } from '@src/shared/application/Clock';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@src/shared/domain/errors/PlatformError';

describe('catalog command and query handlers', () => {
  it('creates products and variants scoped to the principal store', async () => {
    const catalog = buildCatalogHarness();
    const product = await catalog.createProduct.execute(admin('store-a'), {
      name: 'Linen Shirt',
      categoryId: 'tops',
    });

    const variant = await catalog.createProductVariant.execute(admin('store-a'), {
      productId: product.id,
      sku: 'LINEN-SHIRT-M',
      barcode: '10001',
      price: 50,
      cost: 20,
      stock: 3,
      minimumStock: 1,
    });

    await expect(catalog.getProductById.execute(admin('store-b'), product.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(catalog.getProductVariantById.execute(admin('store-b'), variant.id)).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(catalog.listProducts.execute(admin('store-a'))).resolves.toHaveLength(1);
    await expect(catalog.listProductVariants.execute(admin('store-a'))).resolves.toHaveLength(1);
  });

  it('does not allow variants for inactive products', async () => {
    const catalog = buildCatalogHarness();
    const product = await catalog.createProduct.execute(admin('store-a'), {
      name: 'Denim Jacket',
      categoryId: 'outerwear',
    });
    await catalog.deactivateProduct.execute(admin('store-a'), product.id);

    await expect(
      catalog.createProductVariant.execute(admin('store-a'), {
        productId: product.id,
        sku: 'DENIM-JACKET-M',
        price: 120,
        cost: 70,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('enforces SKU and barcode uniqueness within a store', async () => {
    const catalog = buildCatalogHarness();
    const product = await catalog.createProduct.execute(admin('store-a'), {
      name: 'Crew Socks',
      categoryId: 'accessories',
    });
    await catalog.createProductVariant.execute(admin('store-a'), {
      productId: product.id,
      sku: 'SOCKS-BLK',
      barcode: '20001',
      price: 10,
      cost: 4,
    });

    await expect(
      catalog.createProductVariant.execute(admin('store-a'), {
        productId: product.id,
        sku: 'SOCKS-BLK',
        price: 12,
        cost: 5,
      })
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      catalog.createProductVariant.execute(admin('store-a'), {
        productId: product.id,
        sku: 'SOCKS-WHT',
        barcode: '20001',
        price: 12,
        cost: 5,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('allows cashiers to read but not mutate catalog data', async () => {
    const catalog = buildCatalogHarness();
    const product = await catalog.createProduct.execute(admin('store-a'), {
      name: 'Belt',
      categoryId: 'accessories',
    });

    await expect(catalog.getProductById.execute(cashier('store-a'), product.id)).resolves.toMatchObject({
      id: product.id,
      name: 'Belt',
    });
    await expect(
      catalog.createProduct.execute(cashier('store-a'), {
        name: 'Wallet',
        categoryId: 'accessories',
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('updates variant merchandising fields without mutating stock', async () => {
    const catalog = buildCatalogHarness();
    const product = await catalog.createProduct.execute(admin('store-a'), {
      name: 'Chino',
      categoryId: 'pants',
    });
    const variant = await catalog.createProductVariant.execute(admin('store-a'), {
      productId: product.id,
      sku: 'CHINO-32',
      price: 85,
      cost: 35,
      stock: 7,
      minimumStock: 2,
    });

    await catalog.updateProductVariant.execute(admin('store-a'), variant.id, {
      price: 90,
      minimumStock: 3,
    });

    await expect(catalog.getProductVariantById.execute(admin('store-a'), variant.id)).resolves.toMatchObject({
      price: 90,
      stock: 7,
      minimumStock: 3,
    });
  });
});

class SequentialIdGenerator implements IdGenerator {
  private next = 0;

  nextId(): string {
    this.next += 1;
    return `id-${this.next}`;
  }
}

function buildCatalogHarness() {
  const store = new InMemoryCatalogStore();
  const products = new InMemoryProductRepository(store);
  const variants = new InMemoryProductVariantRepository(store);
  const authorizationPolicy = new RoleBasedCatalogAuthorizationPolicy();
  const clock: Clock = {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  };
  const idGenerator: IdGenerator = new SequentialIdGenerator();

  return {
    createProduct: new CreateProductHandler(products, authorizationPolicy, clock, idGenerator),
    deactivateProduct: new DeactivateProductHandler(products, authorizationPolicy, clock),
    createProductVariant: new CreateProductVariantHandler(products, variants, authorizationPolicy, clock, idGenerator),
    updateProductVariant: new UpdateProductVariantHandler(variants, authorizationPolicy, clock),
    getProductById: new GetProductByIdHandler(products, authorizationPolicy),
    listProducts: new ListProductsHandler(products, authorizationPolicy),
    getProductVariantById: new GetProductVariantByIdHandler(variants, authorizationPolicy),
    listProductVariants: new ListProductVariantsHandler(variants, authorizationPolicy),
  };
}

function admin(storeId: string): AuthenticatedPrincipal {
  return {
    subjectId: 'subject-1',
    storeId,
    roles: ['ADMIN'],
  };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return {
    subjectId: 'subject-2',
    storeId,
    roles: ['CASHIER'],
  };
}
