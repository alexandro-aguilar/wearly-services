import { ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  CatalogAuthorizationPolicy,
  CatalogClock,
  IdGenerator,
} from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogManage } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { Product } from '@src/app/modules/catalog/domain/Product';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface CreateProductCommand {
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly brandId?: string;
}

export class CreateProductHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: CatalogAuthorizationPolicy,
    private readonly clock: CatalogClock,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(principal: AuthenticatedPrincipal, command: CreateProductCommand): Promise<{ id: string }> {
    authorizeCatalogManage(this.authorizationPolicy, principal);

    const product = Product.create({
      ...command,
      id: this.idGenerator.nextId(),
      storeId: principal.storeId,
      now: this.clock.now(),
    });
    const snapshot = product.toSnapshot();
    await this.products.save(snapshot);

    return { id: snapshot.id };
  }
}
