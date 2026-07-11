import { CognitoJwtVerifier } from '@src/app/modules/auth/infrastructure/CognitoJwtVerifier';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

type Headers = Record<string, string | undefined>;

const verifier = CognitoJwtVerifier.fromEnvironment();

/**
 * Temporary compatibility adapter for the inherited Lambda entrypoints.
 * Authentication remains asynchronous because Cognito signing keys are remote.
 */
export default class Authorization {
  static authenticate(headers: Headers): Promise<AuthenticatedPrincipal> {
    const authorization = Object.entries(headers).find(([name]) => name.toLowerCase() === 'authorization')?.[1];
    return verifier.verifyBearerToken(authorization);
  }
}
