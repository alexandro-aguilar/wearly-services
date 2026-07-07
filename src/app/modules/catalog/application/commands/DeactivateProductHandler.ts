import { ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { authorizeCatalogManage, findProductOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { Product } from '@src/app/modules/catalog/domain/Product';
import { Clock } from '@src/shared/application/Clock';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class DeactivateProductHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: AuthorizationPolicy,
    private readonly clock: Clock
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<{ id: string; active: false }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);

    const product = Product.rehydrate(await findProductOrThrow(this.products, principal.storeId, id));
    product.deactivate(this.clock.now());
    await this.products.save(product.toSnapshot());

    return { id, active: false };
  }
}
