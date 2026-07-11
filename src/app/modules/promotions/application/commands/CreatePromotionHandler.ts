import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import {
  PromotionAuthorizationPolicy,
  PromotionIdGenerator,
} from '@src/app/modules/promotions/application/ports/PromotionServices';
import { authorizePromotionManage } from '@src/app/modules/promotions/application/shared/PromotionGuards';
import {
  Promotion,
  PromotionAction,
  PromotionCondition,
  PromotionType,
} from '@src/app/modules/promotions/domain/Promotion';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface CreatePromotionCommand {
  readonly name: string;
  readonly description?: string;
  readonly type: PromotionType;
  readonly conditions: readonly PromotionCondition[];
  readonly actions: readonly PromotionAction[];
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly priority: number;
  readonly active?: boolean;
}

export class CreatePromotionHandler {
  constructor(
    private readonly promotions: PromotionRepository,
    private readonly authorization: PromotionAuthorizationPolicy,
    private readonly ids: PromotionIdGenerator
  ) {}

  async execute(principal: AuthenticatedPrincipal, command: CreatePromotionCommand): Promise<{ id: string }> {
    authorizePromotionManage(this.authorization, principal);
    const promotion = Promotion.create({
      ...command,
      id: this.ids.nextId(),
      storeId: principal.storeId,
    }).toSnapshot();
    await this.promotions.save(promotion);
    return { id: promotion.id };
  }
}
