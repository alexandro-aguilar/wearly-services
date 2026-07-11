import {
  InventoryAvailabilitySnapshot,
  InventoryVariantStock,
} from '@src/app/modules/inventory/domain/InventoryVariantStock';
import { InventoryVariantStockGateway } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/ports/InventoryServices';
import { authorizeInventoryReadAvailability } from '@src/app/modules/inventory/application/shared/InventoryGuards';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListLowStockVariantsHandler {
  constructor(
    private readonly stockGateway: InventoryVariantStockGateway,
    private readonly authorizationPolicy: InventoryAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<InventoryAvailabilitySnapshot[]> {
    authorizeInventoryReadAvailability(this.authorizationPolicy, principal);

    const variants = await this.stockGateway.listLowStock(principal.storeId);
    return variants.map((variant) => InventoryVariantStock.rehydrate(variant).toAvailability());
  }
}
