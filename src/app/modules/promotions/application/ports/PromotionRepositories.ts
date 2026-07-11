import { PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';

export interface PromotionRepository {
  save(promotion: PromotionSnapshot): Promise<void>;
  findById(storeId: string, id: string): Promise<PromotionSnapshot | undefined>;
  list(storeId: string): Promise<PromotionSnapshot[]>;
  listActive(storeId: string, at: Date): Promise<PromotionSnapshot[]>;
}
