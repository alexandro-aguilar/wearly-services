import { describe, expect, it } from 'vitest';
import { AdjustInventoryHandler } from '@src/app/modules/inventory/application/commands/AdjustInventoryHandler';
import { RoleBasedInventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/InventoryAuthorizationPolicy';
import { InventoryClock, InventoryIdGenerator } from '@src/app/modules/inventory/application/ports/InventoryServices';
import {
  InventoryMovementRepository,
  InventoryVariantStockGateway,
} from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { GetInventoryAvailabilityHandler } from '@src/app/modules/inventory/application/queries/GetInventoryAvailabilityHandler';
import { ListInventoryMovementsHandler } from '@src/app/modules/inventory/application/queries/ListInventoryMovementsHandler';
import { ListLowStockVariantsHandler } from '@src/app/modules/inventory/application/queries/ListLowStockVariantsHandler';
import { InventoryMovementSnapshot } from '@src/app/modules/inventory/domain/InventoryMovement';
import { InventoryVariantStockSnapshot } from '@src/app/modules/inventory/domain/InventoryVariantStock';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError, NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

describe('inventory command and query handlers', () => {
  it('adjusts inventory and records an audit movement', async () => {
    const inventory = buildInventoryHarness([
      variant({ storeId: 'store-a', id: 'variant-1', stock: 4, minimumStock: 2 }),
    ]);

    const result = await inventory.adjustInventory.execute(manager('store-a'), {
      productVariantId: 'variant-1',
      newStock: 9,
    });

    await expect(
      inventory.getAvailability.execute(cashier('store-a'), { productVariantId: 'variant-1' })
    ).resolves.toMatchObject({
      productVariantId: 'variant-1',
      stock: 9,
      available: true,
      lowStock: false,
    });
    await expect(
      inventory.listMovements.execute(manager('store-a'), { productVariantId: 'variant-1' })
    ).resolves.toEqual([
      expect.objectContaining({
        id: result.id,
        storeId: 'store-a',
        productVariantId: 'variant-1',
        type: 'MANUAL_ADJUSTMENT',
        quantity: 5,
        previousStock: 4,
        newStock: 9,
      }),
    ]);
  });

  it('rejects manual adjustments that would make stock negative', async () => {
    const inventory = buildInventoryHarness([
      variant({ storeId: 'store-a', id: 'variant-1', stock: 4, minimumStock: 2 }),
    ]);

    await expect(
      inventory.adjustInventory.execute(manager('store-a'), {
        productVariantId: 'variant-1',
        newStock: -1,
      })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(inventory.listMovements.execute(manager('store-a'), {})).resolves.toHaveLength(0);
  });

  it('rejects manual adjustments that do not change stock', async () => {
    const inventory = buildInventoryHarness([
      variant({ storeId: 'store-a', id: 'variant-1', stock: 4, minimumStock: 2 }),
    ]);

    await expect(
      inventory.adjustInventory.execute(manager('store-a'), {
        productVariantId: 'variant-1',
        newStock: 4,
      })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(inventory.listMovements.execute(manager('store-a'), {})).resolves.toHaveLength(0);
  });

  it('keeps inventory reads and writes scoped to the principal store', async () => {
    const inventory = buildInventoryHarness([
      variant({ storeId: 'store-a', id: 'variant-1', stock: 4, minimumStock: 2 }),
    ]);

    await expect(
      inventory.getAvailability.execute(cashier('store-b'), { productVariantId: 'variant-1' })
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      inventory.adjustInventory.execute(manager('store-b'), {
        productVariantId: 'variant-1',
        newStock: 8,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lists low stock variants for the current store only', async () => {
    const inventory = buildInventoryHarness([
      variant({ storeId: 'store-a', id: 'low', stock: 2, minimumStock: 2 }),
      variant({ storeId: 'store-a', id: 'healthy', stock: 3, minimumStock: 2 }),
      variant({ storeId: 'store-b', id: 'other-store-low', stock: 1, minimumStock: 3 }),
    ]);

    await expect(inventory.listLowStockVariants.execute(manager('store-a'))).resolves.toEqual([
      expect.objectContaining({
        productVariantId: 'low',
        stock: 2,
        minimumStock: 2,
      }),
    ]);
  });

  it('allows cashiers to read availability but not adjust inventory or read movement history', async () => {
    const inventory = buildInventoryHarness([
      variant({ storeId: 'store-a', id: 'variant-1', stock: 4, minimumStock: 2 }),
    ]);

    await expect(
      inventory.getAvailability.execute(cashier('store-a'), { productVariantId: 'variant-1' })
    ).resolves.toMatchObject({
      stock: 4,
    });
    await expect(
      inventory.adjustInventory.execute(cashier('store-a'), {
        productVariantId: 'variant-1',
        newStock: 5,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(inventory.listMovements.execute(cashier('store-a'), {})).rejects.toBeInstanceOf(ForbiddenError);
  });
});

class SequentialInventoryIdGenerator implements InventoryIdGenerator {
  private next = 0;

  nextId(): string {
    this.next += 1;
    return `movement-${this.next}`;
  }
}

class FakeInventoryVariantStockGateway implements InventoryVariantStockGateway {
  constructor(private readonly variants: InventoryVariantStockSnapshot[]) {}

  async findById(storeId: string, productVariantId: string): Promise<InventoryVariantStockSnapshot | undefined> {
    return this.variants.find(
      (variant) => variant.storeId === storeId && variant.productVariantId === productVariantId
    );
  }

  async listLowStock(storeId: string): Promise<InventoryVariantStockSnapshot[]> {
    return this.variants.filter((variant) => variant.storeId === storeId && variant.stock <= variant.minimumStock);
  }

  async saveStock(variant: InventoryVariantStockSnapshot): Promise<void> {
    const index = this.variants.findIndex(
      (item) => item.storeId === variant.storeId && item.productVariantId === variant.productVariantId
    );

    if (index === -1) {
      this.variants.push(variant);
      return;
    }

    this.variants[index] = variant;
  }
}

class FakeInventoryMovementRepository implements InventoryMovementRepository {
  readonly movements: InventoryMovementSnapshot[] = [];

  async save(movement: InventoryMovementSnapshot): Promise<void> {
    this.movements.push(movement);
  }

  async list(storeId: string, productVariantId?: string): Promise<InventoryMovementSnapshot[]> {
    return this.movements.filter(
      (movement) =>
        movement.storeId === storeId &&
        (productVariantId === undefined || movement.productVariantId === productVariantId)
    );
  }
}

function buildInventoryHarness(variants: InventoryVariantStockSnapshot[]) {
  const stockGateway = new FakeInventoryVariantStockGateway(variants);
  const movements = new FakeInventoryMovementRepository();
  const authorizationPolicy = new RoleBasedInventoryAuthorizationPolicy();
  const clock: InventoryClock = {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  };
  const idGenerator: InventoryIdGenerator = new SequentialInventoryIdGenerator();

  return {
    adjustInventory: new AdjustInventoryHandler(stockGateway, movements, authorizationPolicy, clock, idGenerator),
    getAvailability: new GetInventoryAvailabilityHandler(stockGateway, authorizationPolicy),
    listMovements: new ListInventoryMovementsHandler(movements, authorizationPolicy),
    listLowStockVariants: new ListLowStockVariantsHandler(stockGateway, authorizationPolicy),
  };
}

function variant(input: {
  readonly storeId: string;
  readonly id: string;
  readonly stock: number;
  readonly minimumStock: number;
}): InventoryVariantStockSnapshot {
  return {
    storeId: input.storeId,
    productVariantId: input.id,
    sku: `${input.id}-sku`,
    barcode: `${input.id}-barcode`,
    stock: input.stock,
    minimumStock: input.minimumStock,
    active: true,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function manager(storeId: string): AuthenticatedPrincipal {
  return {
    subjectId: 'subject-1',
    storeId,
    roles: ['MANAGER'],
  };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return {
    subjectId: 'subject-2',
    storeId,
    roles: ['CASHIER'],
  };
}
