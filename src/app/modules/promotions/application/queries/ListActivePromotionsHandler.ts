import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import {
  PromotionAuthorizationPolicy,
  PromotionClock,
} from '@src/app/modules/promotions/application/ports/PromotionServices';
import { authorizePromotionReadActive } from '@src/app/modules/promotions/application/shared/PromotionGuards';
import { PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListActivePromotionsHandler {
  constructor(
    private readonly promotions: PromotionRepository,
    private readonly authorization: PromotionAuthorizationPolicy,
    private readonly clock: PromotionClock
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<PromotionSnapshot[]> {
    authorizePromotionReadActive(this.authorization, principal);
    return this.promotions.listActive(principal.storeId, this.clock.now());
  }
}
