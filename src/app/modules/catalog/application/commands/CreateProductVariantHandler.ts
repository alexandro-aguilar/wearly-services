import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  CatalogAuthorizationPolicy,
  CatalogClock,
  IdGenerator,
} from '@src/app/modules/catalog/application/ports/CatalogServices';
import {
  assertBarcodeAvailable,
  assertSkuAvailable,
  authorizeCatalogManage,
  findProductOrThrow,
} from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { Product } from '@src/app/modules/catalog/domain/Product';
import { CreateProductVariantInput, ProductVariant } from '@src/app/modules/catalog/domain/ProductVariant';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type CreateProductVariantCommand = Omit<CreateProductVariantInput, 'id' | 'storeId' | 'now'>;

export class CreateProductVariantHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly variants: ProductVariantRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy,
    private readonly clock: CatalogClock,
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
