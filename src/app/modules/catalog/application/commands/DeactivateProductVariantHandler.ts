import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy, CatalogClock } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogManage, findVariantOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductVariant } from '@src/app/modules/catalog/domain/ProductVariant';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class DeactivateProductVariantHandler {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy,
    private readonly clock: CatalogClock
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<{ id: string; active: false }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);

    const variant = ProductVariant.rehydrate(await findVariantOrThrow(this.variants, principal.storeId, id));
    variant.deactivate(this.clock.now());
    await this.variants.save(variant.toSnapshot());

    return { id, active: false };
  }
}
