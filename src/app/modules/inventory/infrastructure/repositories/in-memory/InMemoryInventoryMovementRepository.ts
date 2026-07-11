import { InventoryMovementRepository } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryMovementSnapshot } from '@src/app/modules/inventory/domain/InventoryMovement';

export class InMemoryInventoryMovementRepository implements InventoryMovementRepository {
  private readonly movements: InventoryMovementSnapshot[] = [];

  async save(movement: InventoryMovementSnapshot): Promise<void> {
    this.movements.push(cloneMovement(movement));
  }

  async list(storeId: string, productVariantId?: string): Promise<InventoryMovementSnapshot[]> {
    return this.movements
      .filter(
        (movement) =>
          movement.storeId === storeId &&
          (productVariantId === undefined || movement.productVariantId === productVariantId)
      )
      .map((movement) => cloneMovement(movement));
  }

  checkpoint(): InventoryMovementSnapshot[] {
    return this.movements.map((movement) => cloneMovement(movement));
  }

  restore(checkpoint: readonly InventoryMovementSnapshot[]): void {
    this.movements.splice(0, this.movements.length, ...checkpoint.map((movement) => cloneMovement(movement)));
  }
}

function cloneMovement(movement: InventoryMovementSnapshot): InventoryMovementSnapshot {
  return {
    ...movement,
    createdAt: new Date(movement.createdAt),
  };
}
