import { SessionRole, SessionStoreDto } from '@src/app/modules/auth/application/dtos/SessionContextDto';

export interface SessionStoreRoleRepository {
  listActiveForSubject(subjectId: string): Promise<readonly SessionStoreDto[]>;
  findActiveForSubjectAndStore(subjectId: string, storeId: string): Promise<SessionStoreDto | undefined>;
}

export function isSessionRole(value: string): value is SessionRole {
  return value === 'ADMIN' || value === 'MANAGER' || value === 'CASHIER';
}
