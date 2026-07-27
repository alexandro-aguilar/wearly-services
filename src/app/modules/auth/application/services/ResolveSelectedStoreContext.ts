import { SessionStoreRoleRepository } from '@src/app/modules/auth/application/ports/SessionContextPorts';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export class ResolveSelectedStoreContext {
  constructor(private readonly roles: SessionStoreRoleRepository) {}

  async execute(principal: AuthenticatedPrincipal, selectedStoreId?: string): Promise<AuthenticatedPrincipal> {
    if (!selectedStoreId || selectedStoreId === principal.storeId) return principal;

    const assignment = await this.roles.findActiveForSubjectAndStore(principal.subjectId, selectedStoreId);
    if (!assignment || !principal.roles.includes(assignment.role)) {
      throw new ForbiddenError('You do not have an active role in this store.');
    }

    return { ...principal, storeId: assignment.id, roles: [assignment.role] };
  }
}
