export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface AuthenticatedPrincipal {
  readonly subjectId: string;
  readonly storeId: string;
  readonly roles: readonly Role[];
}

export interface AuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean;
}
