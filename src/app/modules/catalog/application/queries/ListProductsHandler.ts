import { ListProductsFilter, ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogRead } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListProductsHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, filter: ListProductsFilter = {}): Promise<ProductSnapshot[]> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return this.products.list(principal.storeId, filter);
  }
}
