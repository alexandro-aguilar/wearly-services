import {
  ListProductVariantsFilter,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { authorizeCatalogRead } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListProductVariantsHandler {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: AuthorizationPolicy
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    filter: ListProductVariantsFilter = {}
  ): Promise<ProductVariantSnapshot[]> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return this.variants.list(principal.storeId, filter);
  }
}
