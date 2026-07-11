import { AuthorizationPolicy } from '@src/shared/application/auth/AuthenticatedPrincipal';

export type PromotionAuthorizationPolicy = AuthorizationPolicy;

export interface PromotionClock {
  now(): Date;
}

export interface PromotionIdGenerator {
  nextId(): string;
}
