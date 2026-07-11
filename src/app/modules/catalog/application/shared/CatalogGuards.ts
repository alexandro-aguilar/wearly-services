import { catalogPermissions } from '@src/app/modules/catalog/application/CatalogAuthorizationPolicy';
import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import { CatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@src/shared/domain/exceptions/PlatformError';

export function authorizeCatalogRead(
  authorizationPolicy: CatalogAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  authorize(authorizationPolicy, principal, catalogPermissions.read);
}

export function authorizeCatalogManage(
  authorizationPolicy: CatalogAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  authorize(authorizationPolicy, principal, catalogPermissions.manage);
}

export async function findProductOrThrow(
  repository: ProductRepository,
  storeId: string,
  id: string
): Promise<ProductSnapshot> {
  const product = await repository.findById(storeId, id);

  if (!product) {
    throw new NotFoundError('Product was not found.');
  }

  return product;
}

export async function findVariantOrThrow(
  repository: ProductVariantRepository,
  storeId: string,
  id: string
): Promise<ProductVariantSnapshot> {
  const variant = await repository.findById(storeId, id);

  if (!variant) {
    throw new NotFoundError('Product variant was not found.');
  }

  return variant;
}

export async function assertSkuAvailable(
  repository: ProductVariantRepository,
  storeId: string,
  sku: string,
  excludingVariantId?: string
): Promise<void> {
  if (!sku?.trim()) {
    throw new ValidationError('SKU is required.');
  }

  if (await repository.skuExists(storeId, sku.trim(), excludingVariantId)) {
    throw new ConflictError('SKU already exists in this store.');
  }
}

export async function assertBarcodeAvailable(
  repository: ProductVariantRepository,
  storeId: string,
  barcode: string | undefined,
  excludingVariantId?: string
): Promise<void> {
  const normalized = barcode?.trim();

  if (!normalized) {
    return;
  }

  if (await repository.barcodeExists(storeId, normalized, excludingVariantId)) {
    throw new ConflictError('Barcode already exists in this store.');
  }
}

function authorize(
  authorizationPolicy: CatalogAuthorizationPolicy,
  principal: AuthenticatedPrincipal,
  permission: string
): void {
  if (!authorizationPolicy.can(principal, permission)) {
    throw new ForbiddenError();
  }
}
