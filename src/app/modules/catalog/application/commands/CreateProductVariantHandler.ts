import { IdGenerator } from '@src/app/modules/catalog/application/IdGenerator';
import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  assertBarcodeAvailable,
  assertSkuAvailable,
  authorizeCatalogManage,
  findProductOrThrow,
} from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { Product } from '@src/app/modules/catalog/domain/Product';
import { CreateProductVariantInput, ProductVariant } from '@src/app/modules/catalog/domain/ProductVariant';
import { Clock } from '@src/shared/application/Clock';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type CreateProductVariantCommand = Omit<CreateProductVariantInput, 'id' | 'storeId' | 'now'>;

export class CreateProductVariantHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: AuthorizationPolicy,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(principal: AuthenticatedPrincipal, command: CreateProductVariantCommand): Promise<{ id: string }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);
    await assertSkuAvailable(this.variants, principal.storeId, command.sku);
    await assertBarcodeAvailable(this.variants, principal.storeId, command.barcode);

    const product = Product.rehydrate(await findProductOrThrow(this.products, principal.storeId, command.productId));
    const variant = ProductVariant.create(
      {
        ...command,
        id: this.idGenerator.nextId(),
        storeId: principal.storeId,
        now: this.clock.now(),
      },
      product
    );
    const snapshot = variant.toSnapshot();
    await this.variants.save(snapshot);

    return { id: snapshot.id };
  }
}
