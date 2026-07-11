import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CognitoJwk,
  CognitoJwksClient,
  CognitoJwtVerifier,
} from '@src/app/modules/auth/infrastructure/CognitoJwtVerifier';
import { UnauthenticatedError } from '@src/shared/domain/exceptions/PlatformError';

const issuer = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example';
const clientId = 'wearly-client';
const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = keyPair.publicKey.export({ format: 'jwk' }) as { n?: string; e?: string };
const jwk: CognitoJwk = { kty: 'RSA', kid: 'key-1', n: publicJwk.n!, e: publicJwk.e! };

class FakeJwksClient implements CognitoJwksClient {
  constructor(private readonly keys: readonly CognitoJwk[]) {}

  async getSigningKeys(): Promise<readonly CognitoJwk[]> {
    return this.keys;
  }
}

describe('CognitoJwtVerifier', () => {
  it('maps verified Cognito claims to a trusted principal', async () => {
    const verifier = new CognitoJwtVerifier({ issuer, clientId }, new FakeJwksClient([jwk]));

    await expect(verifier.verifyBearerToken(`Bearer ${token()} `)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(verifier.verifyBearerToken(`Bearer ${token()}`)).resolves.toEqual({
      subjectId: 'user-1',
      storeId: 'store-a',
      roles: ['MANAGER'],
    });
  });

  it('rejects tokens with an invalid signature, issuer, client, or store context', async () => {
    const verifier = new CognitoJwtVerifier({ issuer, clientId }, new FakeJwksClient([jwk]));

    await expect(verifier.verifyBearerToken(`Bearer ${token({}, 'tampered')}`)).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    await expect(
      verifier.verifyBearerToken(`Bearer ${token({ iss: 'https://other.example' })}`)
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(verifier.verifyBearerToken(`Bearer ${token({ aud: 'wrong-client' })}`)).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    await expect(
      verifier.verifyBearerToken(`Bearer ${token({ 'custom:store_id': undefined })}`)
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects missing credentials and expired tokens', async () => {
    const verifier = new CognitoJwtVerifier({ issuer, clientId }, new FakeJwksClient([jwk]));

    await expect(verifier.verifyBearerToken()).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(verifier.verifyBearerToken(`Bearer ${token({ exp: 1 })}`)).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
  });

  it('accepts a Cognito access token when its client ID matches', async () => {
    const verifier = new CognitoJwtVerifier({ issuer, clientId }, new FakeJwksClient([jwk]));

    await expect(
      verifier.verifyBearerToken(`Bearer ${token({ token_use: 'access', aud: undefined, client_id: clientId })}`)
    ).resolves.toMatchObject({ subjectId: 'user-1', storeId: 'store-a' });
  });
});

function token(overrides: Record<string, unknown> = {}, signatureOverride?: string): string {
  const header = encode({ alg: 'RS256', kid: 'key-1', typ: 'JWT' });
  const claims = encode({
    sub: 'user-1',
    iss: issuer,
    aud: clientId,
    token_use: 'id',
    exp: Math.floor(Date.now() / 1000) + 60,
    'custom:store_id': 'store-a',
    'cognito:groups': ['MANAGER'],
    ...overrides,
  });
  const content = `${header}.${claims}`;
  const signature =
    signatureOverride || sign('RSA-SHA256', Buffer.from(content), keyPair.privateKey).toString('base64url');
  return `${content}.${signature}`;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
