import { describe, expect, it } from 'vitest';
import {
  GetSessionContextHandler,
  SelectSessionStoreHandler,
} from '@src/app/modules/auth/application/queries/SessionContextHandlers';
import { ForbiddenError } from '@src/shared/domain/exceptions/PlatformError';

describe('session context handlers', () => {
  const roles = {
    listActiveForSubject: async () => [
      { id: 'store-a', name: 'Main store', role: 'MANAGER' as const },
      { id: 'store-b', name: 'Outlet', role: 'CASHIER' as const },
      { id: 'store-c', name: 'Disabled role', role: 'ADMIN' as const },
    ],
    findActiveForSubjectAndStore: async () => undefined,
  };
  const principal = { subjectId: 'user-1', storeId: 'store-a', roles: ['MANAGER', 'CASHIER'] };

  it('returns only active roles trusted by both the JWT and store-role mapping', async () => {
    await expect(new GetSessionContextHandler(roles).execute(principal)).resolves.toEqual({
      user: { id: 'user-1' },
      role: 'MANAGER',
      store: { id: 'store-a', name: 'Main store', role: 'MANAGER' },
      currency: 'MXN',
      timeZone: 'America/Merida',
      availableStores: [
        { id: 'store-a', name: 'Main store', role: 'MANAGER' },
        { id: 'store-b', name: 'Outlet', role: 'CASHIER' },
      ],
    });
  });

  it('allows selecting another active authorized store and rejects unassigned stores', async () => {
    const handler = new SelectSessionStoreHandler(roles);
    await expect(handler.execute(principal, 'store-b')).resolves.toMatchObject({
      role: 'CASHIER',
      store: { id: 'store-b', name: 'Outlet', role: 'CASHIER' },
    });
    await expect(handler.execute(principal, 'store-c')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
