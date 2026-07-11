import { InventoryVariantStock } from '@src/app/modules/inventory/domain/InventoryVariantStock';
import { InventoryMovement } from '@src/app/modules/inventory/domain/InventoryMovement';
import {
  InventoryMovementRepository,
  InventoryVariantStockGateway,
} from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import {
  InventoryAuthorizationPolicy,
  InventoryClock,
  InventoryIdGenerator,
} from '@src/app/modules/inventory/application/ports/InventoryServices';
import { authorizeInventoryAdjust } from '@src/app/modules/inventory/application/shared/InventoryGuards';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface AdjustInventoryCommand {
  readonly productVariantId: string;
  readonly newStock: number;
}

export interface AdjustInventoryResult {
  readonly id: string;
}

export class AdjustInventoryHandler {
  constructor(
    private readonly stockGateway: InventoryVariantStockGateway,
    private readonly movements: InventoryMovementRepository,
    private readonly authorizationPolicy: InventoryAuthorizationPolicy,
    private readonly clock: InventoryClock,
    private readonly idGenerator: InventoryIdGenerator
  ) {}

  async execute(principal: AuthenticatedPrincipal, command: AdjustInventoryCommand): Promise<AdjustInventoryResult> {
    authorizeInventoryAdjust(this.authorizationPolicy, principal);

    const existingVariant = await this.stockGateway.findById(principal.storeId, command.productVariantId);
    if (!existingVariant) {
      throw new NotFoundError('Product variant was not found.');
    }

    const now = this.clock.now();
    const variant = InventoryVariantStock.rehydrate(existingVariant);
    const adjustment = variant.adjustTo(command.newStock, now);

    if (adjustment.quantity === 0) {
      throw new ValidationError('Inventory adjustment must change stock.');
    }

    const movement = InventoryMovement.create({
      id: this.idGenerator.nextId(),
      storeId: principal.storeId,
      productVariantId: command.productVariantId,
      type: 'MANUAL_ADJUSTMENT',
      quantity: adjustment.quantity,
      previousStock: adjustment.previousStock,
      newStock: adjustment.newStock,
      createdAt: now,
    });
    const movementSnapshot = movement.toSnapshot();

    await this.stockGateway.saveStock(variant.toSnapshot());
    await this.movements.save(movementSnapshot);

    return { id: movementSnapshot.id };
  }
}
