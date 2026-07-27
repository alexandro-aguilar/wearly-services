import { and, asc, eq } from 'drizzle-orm';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { stores, userStoreRoles } from '@src/app/core/infrastructure/database/schema';
import { SessionStoreDto } from '@src/app/modules/auth/application/dtos/SessionContextDto';
import { isSessionRole, SessionStoreRoleRepository } from '@src/app/modules/auth/application/ports/SessionContextPorts';

export class DrizzleSessionStoreRoleRepository implements SessionStoreRoleRepository {
  async listActiveForSubject(subjectId: string): Promise<readonly SessionStoreDto[]> {
    const rows = await db
      .select({ id: stores.id, name: stores.name, role: userStoreRoles.role })
      .from(userStoreRoles)
      .innerJoin(stores, eq(stores.id, userStoreRoles.storeId))
      .where(
        and(eq(userStoreRoles.cognitoSubject, subjectId), eq(userStoreRoles.active, true), eq(stores.active, true))
      )
      .orderBy(asc(stores.name));
    return rows.filter((row): row is { id: string; name: string; role: SessionStoreDto['role'] } =>
      isSessionRole(row.role)
    );
  }

  async findActiveForSubjectAndStore(subjectId: string, storeId: string): Promise<SessionStoreDto | undefined> {
    const [row] = await db
      .select({ id: stores.id, name: stores.name, role: userStoreRoles.role })
      .from(userStoreRoles)
      .innerJoin(stores, eq(stores.id, userStoreRoles.storeId))
      .where(
        and(
          eq(userStoreRoles.cognitoSubject, subjectId),
          eq(userStoreRoles.storeId, storeId),
          eq(userStoreRoles.active, true),
          eq(stores.active, true)
        )
      )
      .limit(1);
    return row && isSessionRole(row.role) ? { id: row.id, name: row.name, role: row.role } : undefined;
  }
}
