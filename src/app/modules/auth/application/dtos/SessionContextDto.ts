export type SessionRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface SessionStoreDto {
  readonly id: string;
  readonly name: string;
  readonly role: SessionRole;
}

export interface SessionUserDto {
  readonly id: string;
  readonly email?: string;
  readonly name?: string;
}

export interface SessionContextDto {
  readonly user: SessionUserDto;
  readonly role: SessionRole;
  readonly store: SessionStoreDto;
  readonly currency: string;
  readonly timeZone: string;
  readonly availableStores: readonly SessionStoreDto[];
}
