import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export const reportingPermissions = { read: 'reporting:read' } as const;

export class RoleBasedReportingAuthorizationPolicy implements ReportingAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean {
    return (
      permission === reportingPermissions.read && principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER')
    );
  }
}
