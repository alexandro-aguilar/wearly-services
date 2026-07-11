import { describe, expect, it } from 'vitest';
import { CreatePromotionHandler } from '@src/app/modules/promotions/application/commands/CreatePromotionHandler';
import { UpdatePromotionHandler } from '@src/app/modules/promotions/application/commands/UpdatePromotionHandler';
import { EvaluatePromotionsHandler } from '@src/app/modules/promotions/application/queries/EvaluatePromotionsHandler';
import { ListActivePromotionsHandler } from '@src/app/modules/promotions/application/queries/ListActivePromotionsHandler';
import { ListPromotionsHandler } from '@src/app/modules/promotions/application/queries/ListPromotionsHandler';
import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import {
  PromotionAuthorizationPolicy,
  PromotionClock,
  PromotionIdGenerator,
} from '@src/app/modules/promotions/application/ports/PromotionServices';
import { RoleBasedPromotionAuthorizationPolicy } from '@src/app/modules/promotions/application/PromotionAuthorizationPolicy';
import { Promotion, PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError, NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

describe('promotion management', () => {
  it('creates, updates, lists, and store-scopes configurable promotions', async () => {
    const promotions = buildHarness();
    const created = await promotions.create.execute(manager('store-a'), {
      name: 'Jacket discount',
      type: 'PERCENTAGE_DISCOUNT',
      conditions: [{ field: 'category', operator: 'EQUALS', value: 'jackets' }],
      actions: [{ type: 'PERCENTAGE_DISCOUNT', value: 20 }],
      priority: 10,
    });

    await promotions.update.execute(manager('store-a'), created.id, {
      name: 'Jacket weekend discount',
      priority: 20,
    });

    await expect(promotions.list.execute(manager('store-a'))).resolves.toEqual([
      expect.objectContaining({
        id: 'promotion-1',
        storeId: 'store-a',
        name: 'Jacket weekend discount',
        priority: 20,
        active: true,
      }),
    ]);
    await expect(promotions.update.execute(manager('store-b'), created.id, { priority: 1 })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('allows cashiers to list active promotions but not manage them', async () => {
    const promotions = buildHarness();
    await expect(promotions.listActive.execute(cashier('store-a'))).resolves.toEqual([]);
    await expect(promotions.create.execute(cashier('store-a'), percentagePromotionInput())).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(promotions.list.execute(cashier('store-a'))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('filters inactive, future, expired, and other-store promotions', async () => {
    const promotions = buildHarness();
    promotions.repository.seed(
      promotion({ id: 'active', storeId: 'store-a', priority: 1 }),
      promotion({ id: 'inactive', storeId: 'store-a', active: false }),
      promotion({ id: 'future', storeId: 'store-a', startsAt: new Date('2026-01-02T00:00:00.000Z') }),
      promotion({ id: 'expired', storeId: 'store-a', endsAt: new Date('2025-12-31T23:59:59.000Z') }),
      promotion({ id: 'other-store', storeId: 'store-b' })
    );

    await expect(promotions.listActive.execute(cashier('store-a'))).resolves.toEqual([
      expect.objectContaining({ id: 'active' }),
    ]);
  });

  it('rejects incompatible conditions, actions, dates, and values', async () => {
    const promotions = buildHarness();
    await expect(
      promotions.create.execute(manager('store-a'), {
        name: 'Invalid combo',
        type: 'FIXED_COMBO',
        conditions: [{ field: 'quantity', operator: 'GREATER_THAN_OR_EQUAL', value: 2 }],
        actions: [{ type: 'PERCENTAGE_DISCOUNT', value: 20 }],
        priority: 1,
      })
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      promotions.create.execute(manager('store-a'), {
        ...percentagePromotionInput(),
        startsAt: new Date('2026-02-01T00:00:00.000Z'),
        endsAt: new Date('2026-01-01T00:00:00.000Z'),
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('deterministic promotion evaluation', () => {
  it('applies a fixed combo: 2 shirts for 499', async () => {
    const result = await evaluate(
      [
        promotion({
          id: 'shirts-499',
          type: 'FIXED_COMBO',
          conditions: [
            { field: 'category', operator: 'EQUALS', value: 'shirts' },
            { field: 'quantity', operator: 'GREATER_THAN_OR_EQUAL', value: 2 },
          ],
          actions: [{ type: 'SET_FIXED_PRICE', value: 499 }],
        }),
      ],
      [cartItem({ variantId: 'shirt-1', category: 'shirts', quantity: 2, unitPrice: 300 })]
    );

    expect(result.totalDiscount).toBe(101);
    expect(result.items).toEqual([expect.objectContaining({ productVariantId: 'shirt-1', discount: 101 })]);
  });

  it('applies a mixed combo only when shirt and pants groups are present', async () => {
    const rule = promotion({
      id: 'outfit-799',
      type: 'MIXED_COMBO',
      conditions: [
        { field: 'category', operator: 'EQUALS', value: 'shirts' },
        { field: 'category', operator: 'EQUALS', value: 'pants' },
      ],
      actions: [{ type: 'SET_FIXED_PRICE', value: 799 }],
    });

    const applied = await evaluate(
      [rule],
      [
        cartItem({ variantId: 'shirt', category: 'shirts', unitPrice: 400 }),
        cartItem({ variantId: 'pants', category: 'pants', unitPrice: 500 }),
      ]
    );
    const ineligible = await evaluate([rule], [cartItem({ variantId: 'shirt', category: 'shirts', unitPrice: 400 })]);

    expect(applied.totalDiscount).toBe(101);
    expect(ineligible.totalDiscount).toBe(0);
  });

  it('applies percentage discounts only to eligible items', async () => {
    const result = await evaluate(
      [promotion({ id: 'jackets-20', ...percentagePromotionInput() })],
      [
        cartItem({ variantId: 'jacket', category: 'jackets', unitPrice: 1000 }),
        cartItem({ variantId: 'shirt', category: 'shirts', unitPrice: 500 }),
      ]
    );

    expect(result.totalDiscount).toBe(200);
    expect(result.items).toEqual([
      expect.objectContaining({ productVariantId: 'jacket', discount: 200 }),
      expect.objectContaining({ productVariantId: 'shirt', discount: 0 }),
    ]);
  });

  it('applies buy 3 get 1 at 50 percent to the cheapest eligible item', async () => {
    const result = await evaluate(
      [
        promotion({
          id: 'buy-3-get-1-half',
          type: 'BUY_X_GET_Y',
          conditions: [
            { field: 'category', operator: 'EQUALS', value: 'socks' },
            { field: 'quantity', operator: 'GREATER_THAN_OR_EQUAL', value: 3 },
          ],
          actions: [{ type: 'CHEAPEST_ITEM_DISCOUNT', value: 50 }],
        }),
      ],
      [
        cartItem({ variantId: 'premium-socks', category: 'socks', quantity: 3, unitPrice: 100 }),
        cartItem({ variantId: 'basic-socks', category: 'socks', unitPrice: 50 }),
      ]
    );

    expect(result.totalDiscount).toBe(25);
    expect(result.items).toEqual([
      expect.objectContaining({ productVariantId: 'premium-socks', discount: 0 }),
      expect.objectContaining({ productVariantId: 'basic-socks', discount: 25 }),
    ]);
  });

  it('evaluates priority deterministically against remaining item value', async () => {
    const result = await evaluate(
      [
        promotion({
          id: 'low-priority',
          ...percentagePromotionInput(),
          priority: 1,
          actions: [{ type: 'PERCENTAGE_DISCOUNT', value: 10 }],
        }),
        promotion({ id: 'high-priority', ...percentagePromotionInput(), priority: 10 }),
      ],
      [cartItem({ variantId: 'jacket', category: 'jackets', unitPrice: 1000 })]
    );

    expect(result.appliedPromotions.map((item) => item.promotionId)).toEqual(['high-priority', 'low-priority']);
    expect(result.totalDiscount).toBe(280);
  });
});

class InMemoryPromotionRepository implements PromotionRepository {
  private readonly promotions: PromotionSnapshot[] = [];

  seed(...promotions: PromotionSnapshot[]): void {
    this.promotions.push(...promotions);
  }

  async save(promotion: PromotionSnapshot): Promise<void> {
    const index = this.promotions.findIndex((item) => item.storeId === promotion.storeId && item.id === promotion.id);
    if (index === -1) this.promotions.push(promotion);
    else this.promotions[index] = promotion;
  }

  async findById(storeId: string, id: string): Promise<PromotionSnapshot | undefined> {
    return this.promotions.find((promotion) => promotion.storeId === storeId && promotion.id === id);
  }

  async list(storeId: string): Promise<PromotionSnapshot[]> {
    return this.promotions.filter((promotion) => promotion.storeId === storeId);
  }

  async listActive(storeId: string, at: Date): Promise<PromotionSnapshot[]> {
    return this.promotions.filter(
      (promotion) =>
        promotion.storeId === storeId &&
        promotion.active &&
        (!promotion.startsAt || promotion.startsAt <= at) &&
        (!promotion.endsAt || promotion.endsAt >= at)
    );
  }
}

class SequentialPromotionIdGenerator implements PromotionIdGenerator {
  private next = 0;
  nextId(): string {
    this.next += 1;
    return `promotion-${this.next}`;
  }
}

function buildHarness() {
  const repository = new InMemoryPromotionRepository();
  const authorization: PromotionAuthorizationPolicy = new RoleBasedPromotionAuthorizationPolicy();
  const clock: PromotionClock = { now: () => new Date('2026-01-01T00:00:00.000Z') };
  const ids = new SequentialPromotionIdGenerator();
  return {
    repository,
    create: new CreatePromotionHandler(repository, authorization, ids),
    update: new UpdatePromotionHandler(repository, authorization),
    list: new ListPromotionsHandler(repository, authorization),
    listActive: new ListActivePromotionsHandler(repository, authorization, clock),
  };
}

async function evaluate(promotions: PromotionSnapshot[], items: ReturnType<typeof cartItem>[]) {
  const repository = new InMemoryPromotionRepository();
  repository.seed(...promotions);
  return new EvaluatePromotionsHandler(repository).execute({
    storeId: 'store-a',
    at: new Date('2026-01-01T00:00:00.000Z'),
    items,
  });
}

function promotion(input: Partial<PromotionSnapshot> & Pick<PromotionSnapshot, 'id'>): PromotionSnapshot {
  return Promotion.create({
    id: input.id,
    storeId: input.storeId ?? 'store-a',
    name: input.name ?? input.id,
    type: input.type ?? 'PERCENTAGE_DISCOUNT',
    conditions: input.conditions ?? [{ field: 'category', operator: 'EQUALS', value: 'jackets' }],
    actions: input.actions ?? [{ type: 'PERCENTAGE_DISCOUNT', value: 20 }],
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    priority: input.priority ?? 1,
    active: input.active,
  }).toSnapshot();
}

function percentagePromotionInput() {
  return {
    name: '20 percent off jackets',
    type: 'PERCENTAGE_DISCOUNT' as const,
    conditions: [{ field: 'category' as const, operator: 'EQUALS' as const, value: 'jackets' }],
    actions: [{ type: 'PERCENTAGE_DISCOUNT' as const, value: 20 }],
    priority: 1,
  };
}

function cartItem(input: { variantId: string; category: string; unitPrice: number; quantity?: number }) {
  return {
    productVariantId: input.variantId,
    productId: `${input.variantId}-product`,
    category: input.category,
    quantity: input.quantity ?? 1,
    unitPrice: input.unitPrice,
  };
}

function manager(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'manager', storeId, roles: ['MANAGER'] };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'cashier', storeId, roles: ['CASHIER'] };
}
