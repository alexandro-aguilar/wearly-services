import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  assertBarcodeAvailable,
  assertSkuAvailable,
  authorizeCatalogManage,
  findVariantOrThrow,
} from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { ProductVariant, UpdateProductVariantInput } from '@src/app/modules/catalog/domain/ProductVariant';
import { Clock } from '@src/shared/application/Clock';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type UpdateProductVariantCommand = Omit<UpdateProductVariantInput, 'now'>;

export class UpdateProductVariantHandler {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: AuthorizationPolicy,
    private readonly clock: Clock
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    id: string,
    command: UpdateProductVariantCommand
  ): Promise<{ id: string }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);

    const variant = ProductVariant.rehydrate(await findVariantOrThrow(this.variants, principal.storeId, id));

    if (command.sku !== undefined) {
      await assertSkuAvailable(this.variants, principal.storeId, command.sku, id);
    }

    if (command.barcode !== undefined) {
      await assertBarcodeAvailable(this.variants, principal.storeId, command.barcode, id);
    }

    variant.update({
      ...command,
      now: this.clock.now(),
    });
    await this.variants.save(variant.toSnapshot());

    return { id };
  }
}
