import { inventoryPermissions } from '@src/app/modules/inventory/application/InventoryAuthorizationPolicy';
import { InventoryAuthorizationPolicy } from '@src/app/modules/inventory/application/ports/InventoryServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export function authorizeInventoryReadAvailability(
  authorizationPolicy: InventoryAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  authorize(authorizationPolicy, principal, inventoryPermissions.readAvailability);
}

export function authorizeInventoryReadMovements(
  authorizationPolicy: InventoryAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  authorize(authorizationPolicy, principal, inventoryPermissions.readMovements);
}

export function authorizeInventoryAdjust(
  authorizationPolicy: InventoryAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  authorize(authorizationPolicy, principal, inventoryPermissions.adjust);
}

function authorize(
  authorizationPolicy: InventoryAuthorizationPolicy,
  principal: AuthenticatedPrincipal,
  permission: string
): void {
  if (!authorizationPolicy.can(principal, permission)) {
    throw new ForbiddenError();
  }
}
