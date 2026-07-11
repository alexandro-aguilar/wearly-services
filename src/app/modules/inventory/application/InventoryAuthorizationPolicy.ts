import { InventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/ports/InventoryServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export const inventoryPermissions = {
  readAvailability: 'inventory:read-availability',
  readMovements: 'inventory:read-movements',
  adjust: 'inventory:adjust',
} as const;

export class RoleBasedInventoryAuthorizationPolicy implements InventoryAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean {
    if (permission === inventoryPermissions.readAvailability) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER');
    }

    if (permission === inventoryPermissions.readMovements || permission === inventoryPermissions.adjust) {
      return principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER');
    }

    return false;
  }
}
