import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogRead, findVariantOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class GetProductVariantByIdHandler {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<ProductVariantSnapshot> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return findVariantOrThrow(this.variants, principal.storeId, id);
  }
}
