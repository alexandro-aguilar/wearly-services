import {
  InventoryAvailabilitySnapshot,
  InventoryVariantStock,
} from '@src/app/modules/inventory/domain/InventoryVariantStock';
import { InventoryVariantStockGateway } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/ports/InventoryServices';
import { authorizeInventoryReadAvailability } from '@src/app/modules/inventory/application/shared/InventoryGuards';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export interface GetInventoryAvailabilityQuery {
  readonly productVariantId: string;
}

export class GetInventoryAvailabilityHandler {
  constructor(
    private readonly stockGateway: InventoryVariantStockGateway,
    private readonly authorizationPolicy: InventoryAuthorizationPolicy
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    query: GetInventoryAvailabilityQuery
  ): Promise<InventoryAvailabilitySnapshot> {
    authorizeInventoryReadAvailability(this.authorizationPolicy, principal);

    const variant = await this.stockGateway.findById(principal.storeId, query.productVariantId);
    if (!variant) {
      throw new NotFoundError('Product variant was not found.');
    }

    return InventoryVariantStock.rehydrate(variant).toAvailability();
  }
}
