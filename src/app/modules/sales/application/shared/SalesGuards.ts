import { SalesAuthorizationPolicy } from '@src/app/modules/sales/application/ports/SalesServices';
import { salesPermissions } from '@src/app/modules/sales/application/SalesAuthorizationPolicy';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export function authorizeSalesComplete(policy: SalesAuthorizationPolicy, principal: AuthenticatedPrincipal): void {
  authorize(policy, principal, salesPermissions.complete);
}

export function authorizeSalesRead(policy: SalesAuthorizationPolicy, principal: AuthenticatedPrincipal): void {
  authorize(policy, principal, salesPermissions.read);
}

function authorize(policy: SalesAuthorizationPolicy, principal: AuthenticatedPrincipal, permission: string): void {
  if (!policy.can(principal, permission)) {
    throw new ForbiddenError();
  }
}
