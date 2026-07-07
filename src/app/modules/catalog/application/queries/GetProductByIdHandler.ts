import { ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { authorizeCatalogRead, findProductOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class GetProductByIdHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: AuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<ProductSnapshot> {
    authorizeCatalogRead(this.authorizationPolicy, principal);
    return findProductOrThrow(this.products, principal.storeId, id);
  }
}
