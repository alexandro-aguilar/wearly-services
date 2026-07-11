import { PromotionAuthorizationPolicy } from '@src/app/modules/promotions/application/ports/PromotionServices';
import { promotionPermissions } from '@src/app/modules/promotions/application/PromotionAuthorizationPolicy';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export function authorizePromotionManage(
  policy: PromotionAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  if (!policy.can(principal, promotionPermissions.manage)) throw new ForbiddenError();
}

export function authorizePromotionReadActive(
  policy: PromotionAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  if (!policy.can(principal, promotionPermissions.readActive)) throw new ForbiddenError();
}
