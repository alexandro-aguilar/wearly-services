import { CustomerAuthorizationPolicy } from '@src/app/modules/customers/application/ports/CustomerServices';
import { customerPermissions } from '@src/app/modules/customers/application/CustomerAuthorizationPolicy';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export function authorizeCustomerRead(policy: CustomerAuthorizationPolicy, principal: AuthenticatedPrincipal): void {
  authorize(policy, principal, customerPermissions.read);
}

export function authorizeCustomerManage(policy: CustomerAuthorizationPolicy, principal: AuthenticatedPrincipal): void {
  authorize(policy, principal, customerPermissions.manage);
}

export function authorizeCustomerDeactivate(
  policy: CustomerAuthorizationPolicy,
  principal: AuthenticatedPrincipal
): void {
  authorize(policy, principal, customerPermissions.deactivate);
}

function authorize(policy: CustomerAuthorizationPolicy, principal: AuthenticatedPrincipal, permission: string): void {
  if (!policy.can(principal, permission)) throw new ForbiddenError();
}
