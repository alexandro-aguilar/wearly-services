import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import { clonePromotion, PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';

export class InMemoryPromotionStore {
  readonly promotions = new Map<string, PromotionSnapshot>();
}

export const sharedInMemoryPromotionStore = new InMemoryPromotionStore();

export class InMemoryPromotionRepository implements PromotionRepository {
  constructor(private readonly store: InMemoryPromotionStore = sharedInMemoryPromotionStore) {}

  async save(promotion: PromotionSnapshot): Promise<void> {
    this.store.promotions.set(key(promotion.storeId, promotion.id), clonePromotion(promotion));
  }

  async findById(storeId: string, id: string): Promise<PromotionSnapshot | undefined> {
    const promotion = this.store.promotions.get(key(storeId, id));
    return promotion ? clonePromotion(promotion) : undefined;
  }

  async list(storeId: string): Promise<PromotionSnapshot[]> {
    return [...this.store.promotions.values()]
      .filter((promotion) => promotion.storeId === storeId)
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
      .map((promotion) => clonePromotion(promotion));
  }

  async listActive(storeId: string, at: Date): Promise<PromotionSnapshot[]> {
    return (await this.list(storeId)).filter(
      (promotion) =>
        promotion.active &&
        (!promotion.startsAt || promotion.startsAt <= at) &&
        (!promotion.endsAt || promotion.endsAt >= at)
    );
  }
}

function key(storeId: string, promotionId: string): string {
  return `${storeId}:${promotionId}`;
}
