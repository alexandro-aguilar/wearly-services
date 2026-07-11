import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import { PromotionAuthorizationPolicy } from '@src/app/modules/promotions/application/ports/PromotionServices';
import { authorizePromotionManage } from '@src/app/modules/promotions/application/shared/PromotionGuards';
import { PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListPromotionsHandler {
  constructor(
    private readonly promotions: PromotionRepository,
    private readonly authorization: PromotionAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<PromotionSnapshot[]> {
    authorizePromotionManage(this.authorization, principal);
    return this.promotions.list(principal.storeId);
  }
}
