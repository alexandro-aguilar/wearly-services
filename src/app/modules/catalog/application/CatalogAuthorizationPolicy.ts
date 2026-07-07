import { AuthenticatedPrincipal, AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export const catalogPermissions = {
  read: 'catalog:read',
  manage: 'catalog:manage',
} as const;

export class RoleBasedCatalogAuthorizationPolicy implements AuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean {
    if (permission === catalogPermissions.read) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER');
    }

    if (permission === catalogPermissions.manage) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER');
    }

    return false;
  }
}
