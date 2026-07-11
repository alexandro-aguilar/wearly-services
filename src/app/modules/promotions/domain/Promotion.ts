import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export type PromotionType = 'FIXED_COMBO' | 'MIXED_COMBO' | 'PERCENTAGE_DISCOUNT' | 'BUY_X_GET_Y';
export type PromotionConditionField = 'category' | 'productId' | 'variantId' | 'quantity' | 'brand';
export type PromotionConditionOperator = 'EQUALS' | 'IN' | 'GREATER_THAN_OR_EQUAL';
export type PromotionActionType =
  | 'SET_FIXED_PRICE'
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'CHEAPEST_ITEM_DISCOUNT';

export interface PromotionCondition {
  readonly field: PromotionConditionField;
  readonly operator: PromotionConditionOperator;
  readonly value: string | number | readonly string[];
}

export interface PromotionAction {
  readonly type: PromotionActionType;
  readonly value: number;
}

export interface PromotionSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly description?: string;
  readonly type: PromotionType;
  readonly conditions: readonly PromotionCondition[];
  readonly actions: readonly PromotionAction[];
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly priority: number;
  readonly active: boolean;
}

export interface CreatePromotionInput extends Omit<PromotionSnapshot, 'active'> {
  readonly active?: boolean;
}

export interface UpdatePromotionInput {
  readonly name?: string;
  readonly description?: string;
  readonly type?: PromotionType;
  readonly conditions?: readonly PromotionCondition[];
  readonly actions?: readonly PromotionAction[];
  readonly startsAt?: Date | null;
  readonly endsAt?: Date | null;
  readonly priority?: number;
  readonly active?: boolean;
}

export class Promotion {
  private constructor(private snapshot: PromotionSnapshot) {}

  static create(input: CreatePromotionInput): Promotion {
    return new Promotion(validate({ ...input, active: input.active ?? true }));
  }

  static rehydrate(snapshot: PromotionSnapshot): Promotion {
    return new Promotion(clonePromotion(snapshot));
  }

  update(input: UpdatePromotionInput): void {
    this.snapshot = validate({
      ...this.snapshot,
      ...input,
      startsAt: input.startsAt === null ? undefined : (input.startsAt ?? this.snapshot.startsAt),
      endsAt: input.endsAt === null ? undefined : (input.endsAt ?? this.snapshot.endsAt),
    });
  }

  toSnapshot(): PromotionSnapshot {
    return clonePromotion(this.snapshot);
  }
}

export function clonePromotion(promotion: PromotionSnapshot): PromotionSnapshot {
  return {
    ...promotion,
    conditions: promotion.conditions.map((condition) => ({
      ...condition,
      value: Array.isArray(condition.value) ? [...condition.value] : condition.value,
    })),
    actions: promotion.actions.map((action) => ({ ...action })),
    startsAt: promotion.startsAt ? new Date(promotion.startsAt) : undefined,
    endsAt: promotion.endsAt ? new Date(promotion.endsAt) : undefined,
  };
}

function validate(input: PromotionSnapshot): PromotionSnapshot {
  if (!input.id.trim() || !input.storeId.trim() || !input.name.trim()) {
    throw new ValidationError('Promotion id, storeId, and name are required.');
  }
  if (!['FIXED_COMBO', 'MIXED_COMBO', 'PERCENTAGE_DISCOUNT', 'BUY_X_GET_Y'].includes(input.type)) {
    throw new ValidationError('Promotion type is invalid.');
  }
  if (!Number.isInteger(input.priority)) {
    throw new ValidationError('Promotion priority must be an integer.');
  }
  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    throw new ValidationError('Promotion start date must not be after its end date.');
  }
  if (input.conditions.length === 0 || input.actions.length !== 1) {
    throw new ValidationError('A promotion requires conditions and exactly one action.');
  }
  input.conditions.forEach(validateCondition);
  validateCompatibility(input.type, input.conditions, input.actions[0]);
  return clonePromotion({ ...input, name: input.name.trim(), description: normalizeOptional(input.description) });
}

function validateCondition(condition: PromotionCondition): void {
  if (condition.field === 'quantity') {
    if (
      condition.operator !== 'GREATER_THAN_OR_EQUAL' ||
      typeof condition.value !== 'number' ||
      !Number.isInteger(condition.value) ||
      condition.value <= 0
    ) {
      throw new ValidationError('Quantity conditions require a positive integer threshold.');
    }
    return;
  }
  if (condition.operator === 'GREATER_THAN_OR_EQUAL' || typeof condition.value === 'number') {
    throw new ValidationError('Promotion selector condition is invalid.');
  }
  if (condition.operator === 'IN' && (!Array.isArray(condition.value) || condition.value.length === 0)) {
    throw new ValidationError('IN conditions require at least one value.');
  }
  if (condition.operator === 'EQUALS' && (typeof condition.value !== 'string' || !condition.value.trim())) {
    throw new ValidationError('EQUALS conditions require one value.');
  }
}

function validateCompatibility(
  type: PromotionType,
  conditions: readonly PromotionCondition[],
  action: PromotionAction
): void {
  if (!Number.isFinite(action.value) || action.value < 0) {
    throw new ValidationError('Promotion action value cannot be negative.');
  }
  const quantity = conditions.find((condition) => condition.field === 'quantity');
  const selectors = conditions.filter((condition) => condition.field !== 'quantity');
  if (type === 'FIXED_COMBO' && (action.type !== 'SET_FIXED_PRICE' || !quantity || selectors.length === 0)) {
    throw new ValidationError('Fixed combos require a selector, quantity, and fixed-price action.');
  }
  if (type === 'MIXED_COMBO' && (action.type !== 'SET_FIXED_PRICE' || selectors.length < 2)) {
    throw new ValidationError('Mixed combos require at least two selector groups and a fixed-price action.');
  }
  if (type === 'PERCENTAGE_DISCOUNT' && !['PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT'].includes(action.type)) {
    throw new ValidationError('Percentage promotions require a percentage or fixed discount action.');
  }
  if (type === 'BUY_X_GET_Y' && (action.type !== 'CHEAPEST_ITEM_DISCOUNT' || !quantity)) {
    throw new ValidationError('Buy-X-get-Y requires a quantity and cheapest-item discount action.');
  }
  if (['PERCENTAGE_DISCOUNT', 'CHEAPEST_ITEM_DISCOUNT'].includes(action.type) && action.value > 100) {
    throw new ValidationError('Percentage action values cannot exceed 100.');
  }
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
