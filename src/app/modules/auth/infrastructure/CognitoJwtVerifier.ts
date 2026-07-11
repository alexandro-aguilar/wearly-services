import { createPublicKey, verify } from 'node:crypto';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { UnauthenticatedError } from '@src/shared/domain/exceptions/PlatformError';

type JwtHeader = {
  readonly alg?: string;
  readonly kid?: string;
};

type JwtClaims = {
  readonly sub?: unknown;
  readonly iss?: unknown;
  readonly exp?: unknown;
  readonly token_use?: unknown;
  readonly aud?: unknown;
  readonly client_id?: unknown;
  readonly store_id?: unknown;
  readonly 'custom:store_id'?: unknown;
  readonly roles?: unknown;
  readonly 'cognito:groups'?: unknown;
};

export interface CognitoJwtVerificationConfig {
  readonly issuer: string;
  readonly clientId: string;
}

export interface CognitoJwk {
  readonly [claim: string]: string | undefined;
  readonly kty: 'RSA';
  readonly kid: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n: string;
  readonly e: string;
}

export interface CognitoJwksClient {
  getSigningKeys(issuer: string): Promise<readonly CognitoJwk[]>;
}

class HttpCognitoJwksClient implements CognitoJwksClient {
  async getSigningKeys(issuer: string): Promise<readonly CognitoJwk[]> {
    let response: Response;
    try {
      response = await fetch(`${issuer}/.well-known/jwks.json`);
    } catch {
      throw new UnauthenticatedError('Unable to validate authentication token.');
    }

    if (!response.ok) {
      throw new UnauthenticatedError('Unable to validate authentication token.');
    }

    const payload: unknown = await response.json();
    if (!isJwksResponse(payload)) {
      throw new UnauthenticatedError('Unable to validate authentication token.');
    }

    return payload.keys.filter(isCognitoJwk);
  }
}

export class CognitoJwtVerifier {
  private readonly keyCache = new Map<string, CognitoJwk>();

  constructor(
    private readonly config: CognitoJwtVerificationConfig,
    private readonly jwksClient: CognitoJwksClient = new HttpCognitoJwksClient()
  ) {}

  static fromEnvironment(environment: NodeJS.ProcessEnv = process.env): CognitoJwtVerifier {
    const issuer = environment.COGNITO_ISSUER;
    const clientId = environment.COGNITO_USER_POOL_CLIENT_ID;

    return new CognitoJwtVerifier({
      issuer: issuer || '',
      clientId: clientId || '',
    });
  }

  async verifyBearerToken(authorizationHeader?: string): Promise<AuthenticatedPrincipal> {
    if (!this.config.issuer || !this.config.clientId) {
      throw new UnauthenticatedError('Authentication is not configured.');
    }

    const token = bearerToken(authorizationHeader);
    const [encodedHeader, encodedClaims, encodedSignature] = token.split('.');
    const header = decodeJson<JwtHeader>(encodedHeader);
    const claims = decodeJson<JwtClaims>(encodedClaims);

    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthenticatedError('Invalid authentication token.');
    }

    this.validateClaims(claims);
    const key = await this.getSigningKey(header.kid);
    const signedContent = Buffer.from(`${encodedHeader}.${encodedClaims}`);
    const signature = base64UrlBuffer(encodedSignature);
    const publicKey = createPublicKey({ key, format: 'jwk' });

    if (!verify('RSA-SHA256', signedContent, publicKey, signature)) {
      throw new UnauthenticatedError('Invalid authentication token.');
    }

    return principalFromClaims(claims);
  }

  private validateClaims(claims: JwtClaims): void {
    const clientMatches =
      (claims.token_use === 'id' && claims.aud === this.config.clientId) ||
      (claims.token_use === 'access' && claims.client_id === this.config.clientId);

    if (claims.iss !== this.config.issuer || !clientMatches) {
      throw new UnauthenticatedError('Invalid authentication token.');
    }

    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthenticatedError('Authentication token has expired.');
    }
  }

  private async getSigningKey(kid: string): Promise<CognitoJwk> {
    const cached = this.keyCache.get(kid);
    if (cached) return cached;

    const keys = await this.jwksClient.getSigningKeys(this.config.issuer);
    for (const key of keys) this.keyCache.set(key.kid, key);

    const key = this.keyCache.get(kid);
    if (!key) throw new UnauthenticatedError('Invalid authentication token.');
    return key;
  }
}

function bearerToken(authorizationHeader?: string): string {
  const match = authorizationHeader?.match(/^Bearer ([^\s]+)$/i);
  if (!match) throw new UnauthenticatedError();
  if (match[1].split('.').length !== 3) throw new UnauthenticatedError('Invalid authentication token.');
  return match[1];
}

function decodeJson<T>(segment: string): T {
  try {
    return JSON.parse(base64UrlBuffer(segment).toString('utf8')) as T;
  } catch {
    throw new UnauthenticatedError('Invalid authentication token.');
  }
}

function base64UrlBuffer(segment: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new UnauthenticatedError('Invalid authentication token.');
  return Buffer.from(segment, 'base64url');
}

function principalFromClaims(claims: JwtClaims): AuthenticatedPrincipal {
  const subjectId = requiredString(claims.sub);
  const storeId = requiredString(claims['custom:store_id'] ?? claims.store_id);
  const roles = rolesFromClaims(claims);

  if (!subjectId || !storeId || roles.length === 0) {
    throw new UnauthenticatedError('Authentication token is missing required claims.');
  }

  return { subjectId, storeId, roles };
}

function rolesFromClaims(claims: JwtClaims): readonly string[] {
  const source = claims['cognito:groups'] ?? claims.roles;
  const candidates = Array.isArray(source) ? source : typeof source === 'string' ? source.split(',') : [];
  return candidates.filter((role): role is string => role === 'ADMIN' || role === 'MANAGER' || role === 'CASHIER');
}

function requiredString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isJwksResponse(value: unknown): value is { keys: unknown[] } {
  return typeof value === 'object' && value !== null && Array.isArray((value as { keys?: unknown }).keys);
}

function isCognitoJwk(value: unknown): value is CognitoJwk {
  if (typeof value !== 'object' || value === null) return false;
  const key = value as Partial<CognitoJwk>;
  return key.kty === 'RSA' && typeof key.kid === 'string' && typeof key.n === 'string' && typeof key.e === 'string';
}
