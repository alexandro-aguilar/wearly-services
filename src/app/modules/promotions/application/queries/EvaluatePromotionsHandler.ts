import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import { PromotionCondition, PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface PromotionCartItem {
  readonly productVariantId: string;
  readonly productId: string;
  readonly category: string;
  readonly brand?: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface EvaluatePromotionsQuery {
  readonly storeId: string;
  readonly at: Date;
  readonly items: readonly PromotionCartItem[];
}

export interface PromotionEvaluationResult {
  readonly totalDiscount: number;
  readonly items: readonly { productVariantId: string; discount: number }[];
  readonly appliedPromotions: readonly {
    promotionId: string;
    name: string;
    discount: number;
  }[];
}

interface Unit {
  readonly itemIndex: number;
  readonly item: PromotionCartItem;
  remaining: number;
}

export class EvaluatePromotionsHandler {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(query: EvaluatePromotionsQuery): Promise<PromotionEvaluationResult> {
    validateCart(query);
    const promotions = (await this.promotions.listActive(query.storeId, query.at)).sort(
      (left, right) => right.priority - left.priority || left.id.localeCompare(right.id)
    );
    const units = expandUnits(query.items);
    const appliedPromotions: Array<{ promotionId: string; name: string; discount: number }> = [];

    for (const promotion of promotions) {
      const discount = applyPromotion(promotion, units);
      if (discount > 0) {
        appliedPromotions.push({ promotionId: promotion.id, name: promotion.name, discount });
      }
    }

    const itemDiscounts = query.items.map((item, itemIndex) => ({
      productVariantId: item.productVariantId,
      discount: money(
        units
          .filter((unit) => unit.itemIndex === itemIndex)
          .reduce((sum, unit) => sum + (unit.item.unitPrice - unit.remaining), 0)
      ),
    }));
    return {
      totalDiscount: money(itemDiscounts.reduce((sum, item) => sum + item.discount, 0)),
      items: itemDiscounts,
      appliedPromotions,
    };
  }
}

function applyPromotion(promotion: PromotionSnapshot, units: Unit[]): number {
  switch (promotion.type) {
    case 'FIXED_COMBO':
      return applyFixedCombo(promotion, units);
    case 'MIXED_COMBO':
      return applyMixedCombo(promotion, units);
    case 'PERCENTAGE_DISCOUNT':
      return applyItemDiscount(promotion, units);
    case 'BUY_X_GET_Y':
      return applyBuyXGetY(promotion, units);
  }
}

function applyFixedCombo(promotion: PromotionSnapshot, units: Unit[]): number {
  const selectors = selectorConditions(promotion);
  const bundleSize = quantityThreshold(promotion);
  const eligible = units.filter((unit) => matchesAll(unit.item, selectors));
  const bundleCount = Math.floor(eligible.length / bundleSize);
  let discount = 0;
  for (let index = 0; index < bundleCount; index += 1) {
    const bundle = eligible.slice(index * bundleSize, (index + 1) * bundleSize);
    discount += applyAmount(bundle, Math.max(0, totalRemaining(bundle) - promotion.actions[0].value));
  }
  return money(discount);
}

function applyMixedCombo(promotion: PromotionSnapshot, units: Unit[]): number {
  const selectors = selectorConditions(promotion);
  const available = [...units];
  let discount = 0;
  while (true) {
    const selected: Unit[] = [];
    for (const selector of selectors) {
      const unit = available
        .filter((candidate) => !selected.includes(candidate) && matches(candidate.item, selector))
        .sort((left, right) => left.remaining - right.remaining || left.itemIndex - right.itemIndex)[0];
      if (!unit) return money(discount);
      selected.push(unit);
    }
    selected.forEach((unit) => available.splice(available.indexOf(unit), 1));
    discount += applyAmount(selected, Math.max(0, totalRemaining(selected) - promotion.actions[0].value));
  }
}

function applyItemDiscount(promotion: PromotionSnapshot, units: Unit[]): number {
  const eligible = units.filter((unit) => matchesAll(unit.item, selectorConditions(promotion)));
  const threshold = optionalQuantityThreshold(promotion);
  if (threshold !== undefined && eligible.length < threshold) return 0;
  const action = promotion.actions[0];
  if (action.type === 'FIXED_DISCOUNT') {
    return money(applyAmount(eligible, action.value));
  }
  return money(eligible.reduce((sum, unit) => sum + applyAmount([unit], unit.remaining * (action.value / 100)), 0));
}

function applyBuyXGetY(promotion: PromotionSnapshot, units: Unit[]): number {
  const buyQuantity = quantityThreshold(promotion);
  const eligible = units
    .filter((unit) => matchesAll(unit.item, selectorConditions(promotion)))
    .sort((left, right) => left.remaining - right.remaining || left.itemIndex - right.itemIndex);
  const rewardCount = Math.floor(eligible.length / (buyQuantity + 1));
  const rewardUnits = eligible.slice(0, rewardCount);
  const percentage = promotion.actions[0].value;
  return money(rewardUnits.reduce((sum, unit) => sum + applyAmount([unit], unit.remaining * (percentage / 100)), 0));
}

function applyAmount(units: Unit[], requestedAmount: number): number {
  let remainingAmount = money(requestedAmount);
  let applied = 0;
  for (const unit of [...units].sort((left, right) => right.remaining - left.remaining)) {
    const amount = Math.min(unit.remaining, remainingAmount);
    unit.remaining = money(unit.remaining - amount);
    applied = money(applied + amount);
    remainingAmount = money(remainingAmount - amount);
    if (remainingAmount === 0) break;
  }
  return applied;
}

function selectorConditions(promotion: PromotionSnapshot): PromotionCondition[] {
  return promotion.conditions.filter((condition) => condition.field !== 'quantity');
}

function quantityThreshold(promotion: PromotionSnapshot): number {
  const value = optionalQuantityThreshold(promotion);
  if (value === undefined) throw new ValidationError('Promotion quantity condition is required.');
  return value;
}

function optionalQuantityThreshold(promotion: PromotionSnapshot): number | undefined {
  return promotion.conditions.find((condition) => condition.field === 'quantity')?.value as number | undefined;
}

function matchesAll(item: PromotionCartItem, conditions: readonly PromotionCondition[]): boolean {
  return conditions.every((condition) => matches(item, condition));
}

function matches(item: PromotionCartItem, condition: PromotionCondition): boolean {
  const actual =
    condition.field === 'variantId'
      ? item.productVariantId
      : condition.field === 'productId'
        ? item.productId
        : condition.field === 'category'
          ? item.category
          : condition.field === 'brand'
            ? item.brand
            : item.quantity;
  if (condition.operator === 'IN') return (condition.value as readonly string[]).includes(String(actual));
  if (condition.operator === 'EQUALS') return actual === condition.value;
  return Number(actual) >= Number(condition.value);
}

function expandUnits(items: readonly PromotionCartItem[]): Unit[] {
  return items.flatMap((item, itemIndex) =>
    Array.from({ length: item.quantity }, () => ({ itemIndex, item, remaining: item.unitPrice }))
  );
}

function totalRemaining(units: readonly Unit[]): number {
  return money(units.reduce((sum, unit) => sum + unit.remaining, 0));
}

function validateCart(query: EvaluatePromotionsQuery): void {
  if (!query.storeId.trim()) throw new ValidationError('storeId is required.');
  for (const item of query.items) {
    if (!item.productVariantId.trim() || !item.productId.trim() || !item.category.trim()) {
      throw new ValidationError('Promotion cart item identifiers are required.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.unitPrice < 0) {
      throw new ValidationError('Promotion cart item quantity or price is invalid.');
    }
  }
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
