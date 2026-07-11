import { AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type SalesAuthorizationPolicy = AuthorizationPolicy;

export interface SalesClock {
  now(): Date;
}

export interface SalesIdGenerator {
  nextId(scope: 'sale'): string;
}
