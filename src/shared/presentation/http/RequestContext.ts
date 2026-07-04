import { FastifyRequest } from 'fastify';
import { AuthenticatedPrincipal, Role } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { UnauthenticatedError, ValidationError } from '@src/shared/domain/errors/PlatformError';

const roleValues: readonly Role[] = ['ADMIN', 'MANAGER', 'CASHIER'];

export interface RequestContext {
  readonly correlationId: string;
  readonly principal?: AuthenticatedPrincipal;
}

export function getCorrelationId(request: FastifyRequest): string {
  const header = request.headers['x-correlation-id'];

  if (Array.isArray(header)) {
    return header[0] ?? request.id;
  }

  return header ?? request.id;
}

export function parsePrincipal(request: FastifyRequest): AuthenticatedPrincipal {
  const subjectId = readRequiredHeader(request, 'x-auth-subject-id');
  const storeId = readRequiredHeader(request, 'x-store-id');
  const rolesHeader = readRequiredHeader(request, 'x-auth-roles');
  const roles = rolesHeader
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

  if (roles.length === 0 || roles.some((role) => !roleValues.includes(role as Role))) {
    throw new ValidationError('Authenticated roles are invalid.');
  }

  return {
    subjectId,
    storeId,
    roles: roles as Role[],
  };
}

export function requirePrincipal(request: FastifyRequest): AuthenticatedPrincipal {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthenticatedError();
  }

  return parsePrincipal(request);
}

function readRequiredHeader(request: FastifyRequest, name: string): string {
  const value = request.headers[name];

  if (!value || Array.isArray(value)) {
    throw new ValidationError(`${name} header is required.`);
  }

  return value;
}
