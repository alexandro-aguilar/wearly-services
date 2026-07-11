import { SalesAuthorizationPolicy } from '@src/app/modules/sales/application/ports/SalesServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export const salesPermissions = {
  complete: 'sales:complete',
  read: 'sales:read',
  cancel: 'sales:cancel',
} as const;

export class RoleBasedSalesAuthorizationPolicy implements SalesAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean {
    if (permission === salesPermissions.complete || permission === salesPermissions.read) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER');
    }
    if (permission === salesPermissions.cancel) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER');
    }
    return false;
  }
}
