import { ListProductsFilter, ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { authorizeCatalogRead } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListProductsHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: AuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, filter: ListProductsFilter = {}): Promise<ProductSnapshot[]> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return this.products.list(principal.storeId, filter);
  }
}
