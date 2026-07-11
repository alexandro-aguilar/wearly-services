import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import { PromotionAuthorizationPolicy } from '@src/app/modules/promotions/application/ports/PromotionServices';
import { authorizePromotionManage } from '@src/app/modules/promotions/application/shared/PromotionGuards';
import { Promotion } from '@src/app/modules/promotions/domain/Promotion';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export class DeactivatePromotionHandler {
  constructor(
    private readonly promotions: PromotionRepository,
    private readonly authorization: PromotionAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<void> {
    authorizePromotionManage(this.authorization, principal);
    const snapshot = await this.promotions.findById(principal.storeId, id);
    if (!snapshot) throw new NotFoundError('Promotion was not found.');
    const promotion = Promotion.rehydrate(snapshot);
    promotion.update({ active: false });
    await this.promotions.save(promotion.toSnapshot());
  }
}
