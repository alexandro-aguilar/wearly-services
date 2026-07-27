import { describe, expect, it } from 'vitest';
import { ResolveSelectedStoreContext } from '@src/app/modules/auth/application/services/ResolveSelectedStoreContext';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

describe('ResolveSelectedStoreContext', () => {
  const principal = { subjectId: 'user-1', storeId: 'store-a', roles: ['MANAGER', 'CASHIER'] };
  const roles = {
    listActiveForSubject: async () => [],
    findActiveForSubjectAndStore: async (_subjectId: string, storeId: string) =>
      storeId === 'store-b' ? { id: 'store-b', name: 'Outlet', role: 'CASHIER' as const } : undefined,
  };

  it('keeps the JWT store when no explicit selected-store header is supplied', async () => {
    await expect(new ResolveSelectedStoreContext(roles).execute(principal)).resolves.toEqual(principal);
  });

  it('uses only an active store role that is also present in the trusted JWT roles', async () => {
    await expect(new ResolveSelectedStoreContext(roles).execute(principal, 'store-b')).resolves.toEqual({
      subjectId: 'user-1',
      storeId: 'store-b',
      roles: ['CASHIER'],
    });
  });

  it('rejects a store that is not actively assigned to the authenticated user', async () => {
    await expect(new ResolveSelectedStoreContext(roles).execute(principal, 'store-c')).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });
});
