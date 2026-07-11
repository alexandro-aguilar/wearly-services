import { InventoryMovementSnapshot } from '@src/app/modules/inventory/domain/InventoryMovement';
import { InventoryMovementRepository } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/ports/InventoryServices';
import { authorizeInventoryReadMovements } from '@src/app/modules/inventory/application/shared/InventoryGuards';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface ListInventoryMovementsQuery {
  readonly productVariantId?: string;
}

export class ListInventoryMovementsHandler {
  constructor(
    private readonly movements: InventoryMovementRepository,
    private readonly authorizationPolicy: InventoryAuthorizationPolicy
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    query: ListInventoryMovementsQuery
  ): Promise<InventoryMovementSnapshot[]> {
    authorizeInventoryReadMovements(this.authorizationPolicy, principal);

    return this.movements.list(principal.storeId, query.productVariantId);
  }
}
