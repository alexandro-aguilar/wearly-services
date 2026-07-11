import { ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogRead, findProductOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class GetProductByIdHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<ProductSnapshot> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return findProductOrThrow(this.products, principal.storeId, id);
  }
}
