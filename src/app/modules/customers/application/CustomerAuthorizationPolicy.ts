import { CustomerAuthorizationPolicy } from '@src/app/modules/customers/application/ports/CustomerServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export const customerPermissions = {
  read: 'customers:read',
  manage: 'customers:manage',
  deactivate: 'customers:deactivate',
} as const;

export class RoleBasedCustomerAuthorizationPolicy implements CustomerAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean {
    if (permission === customerPermissions.read || permission === customerPermissions.manage) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER');
    }
    if (permission === customerPermissions.deactivate) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER');
    }
    return false;
  }
}
