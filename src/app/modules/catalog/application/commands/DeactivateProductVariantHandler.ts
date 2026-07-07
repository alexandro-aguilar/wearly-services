import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { authorizeCatalogManage, findVariantOrThrow } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductVariant } from '@src/app/modules/catalog/domain/ProductVariant';
import { Clock } from '@src/shared/application/Clock';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class DeactivateProductVariantHandler {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: AuthorizationPolicy,
    private readonly clock: Clock
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<{ id: string; active: false }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);

    const variant = ProductVariant.rehydrate(await findVariantOrThrow(this.variants, principal.storeId, id));
    variant.deactivate(this.clock.now());
    await this.variants.save(variant.toSnapshot());

    return { id, active: false };
  }
}
