import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface InventoryAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean;
}

export interface InventoryClock {
  now(): Date;
}

export interface InventoryIdGenerator {
  nextId(): string;
}
