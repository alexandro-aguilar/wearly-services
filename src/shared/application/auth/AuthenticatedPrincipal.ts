export interface AuthenticatedPrincipal {
  readonly subjectId: string;
  readonly storeId: string;
  readonly roles: readonly string[];
}

export interface AuthorizationPolicy {
  can(principal: AuthenticatedPrincipal, permission: string): boolean;
}
