import { SessionContextDto, SessionStoreDto } from '@src/app/modules/auth/application/dtos/SessionContextDto';
import { SessionStoreRoleRepository } from '@src/app/modules/auth/application/ports/SessionContextPorts';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

export class GetSessionContextHandler {
  constructor(private readonly roles: SessionStoreRoleRepository) {}

  async execute(principal: AuthenticatedPrincipal): Promise<SessionContextDto> {
    return sessionFor(principal, principal.storeId, await this.roles.listActiveForSubject(principal.subjectId));
  }
}

export class SelectSessionStoreHandler {
  constructor(private readonly roles: SessionStoreRoleRepository) {}

  async execute(principal: AuthenticatedPrincipal, storeId: string): Promise<SessionContextDto> {
    return sessionFor(principal, storeId, await this.roles.listActiveForSubject(principal.subjectId));
  }
}

function sessionFor(
  principal: AuthenticatedPrincipal,
  selectedStoreId: string,
  assignments: readonly SessionStoreDto[]
): SessionContextDto {
  const availableStores = assignments.filter((assignment) => principal.roles.includes(assignment.role));
  const store = availableStores.find((assignment) => assignment.id === selectedStoreId);
  if (!store) throw new ForbiddenError('You do not have an active role in this store.');
  return {
    user: { id: principal.subjectId },
    role: store.role,
    store,
    currency: 'MXN',
    timeZone: 'America/Merida',
    availableStores,
  };
}
