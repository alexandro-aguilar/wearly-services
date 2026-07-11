import { ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy, CatalogClock } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogManage, findProductOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { Product, UpdateProductInput } from '@src/app/modules/catalog/domain/Product';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type UpdateProductCommand = Omit<UpdateProductInput, 'now'>;

export class UpdateProductHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy,
    private readonly clock: CatalogClock
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string, command: UpdateProductCommand): Promise<{ id: string }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);

    const product = Product.rehydrate(await findProductOrThrow(this.products, principal.storeId, id));
    product.update({
      ...command,
      now: this.clock.now(),
    });
    await this.products.save(product.toSnapshot());

    return { id };
  }
}
