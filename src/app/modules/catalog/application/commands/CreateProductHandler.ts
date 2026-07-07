import { ProductRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { authorizeCatalogManage } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { Product } from '@src/app/modules/catalog/domain/Product';
import { Clock } from '@src/shared/application/Clock';
import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { IdGenerator } from '@src/app/modules/catalog/application/IdGenerator';

export interface CreateProductCommand {
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly brandId?: string;
}

export class CreateProductHandler {
  constructor(
    private readonly products: ProductRepository,
    private readonly authorizationPolicy: AuthorizationPolicy,
    private readonly clock: Clock,
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
