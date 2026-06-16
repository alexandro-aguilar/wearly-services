/* Simple JWT decoder used in controllers to extract claims from bearer tokens.
 * This does NOT verify signatures; it only base64url-decodes the payload and checks expiry.
 */
export interface DecodedJwt {
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeBearerToken(authorizationHeader?: string): DecodedJwt {
  if (!authorizationHeader) {
    throw new Error('Authorization header missing');
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    throw new Error('Authorization header must be in the format: Bearer <token>');
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT format');
  }

  const payload = base64UrlDecode(parts[1]);
  const claims: DecodedJwt = JSON.parse(payload);

  if (typeof claims.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (now >= claims.exp) {
      throw new Error('JWT has expired');
    }
  }

  return claims;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}
