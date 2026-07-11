import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { reportingPermissions } from '@src/app/modules/reporting/application/ReportingAuthorizationPolicy';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export function authorizeReportingRead(policy: ReportingAuthorizationPolicy, principal: AuthenticatedPrincipal): void {
  if (!policy.can(principal, reportingPermissions.read)) throw new ForbiddenError();
}
