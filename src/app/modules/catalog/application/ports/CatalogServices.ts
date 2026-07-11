import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface CatalogAuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean;
}

export interface CatalogClock {
  now(): Date;
}

export interface IdGenerator {
  nextId(): string;
}
