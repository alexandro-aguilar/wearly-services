import {
  ListProductVariantsFilter,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogRead } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListProductVariantsHandler {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    filter: ListProductVariantsFilter = {}
  ): Promise<ProductVariantSnapshot[]> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return this.variants.list(principal.storeId, filter);
  }
}
