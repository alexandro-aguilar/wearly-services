import { PromotionAuthorizationPolicy } from '@src/app/modules/promotions/application/ports/PromotionServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export const promotionPermissions = {
  manage: 'promotions:manage',
  readActive: 'promotions:read-active',
} as const;

export class RoleBasedPromotionAuthorizationPolicy implements PromotionAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean {
    if (permission === promotionPermissions.readActive) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER');
    }
    if (permission === promotionPermissions.manage) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER');
    }
    return false;
  }
}
