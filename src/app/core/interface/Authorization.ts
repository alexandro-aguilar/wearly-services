import { CognitoJwtVerifier } from '@src/app/modules/auth/infrastructure/CognitoJwtVerifier';
import { ResolveSelectedStoreContext } from '@src/app/modules/auth/application/services/ResolveSelectedStoreContext';
import authContainer from '@src/app/modules/auth/config/container';
import authTypes from '@src/app/modules/auth/config/types';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

type Headers = Record<string, string | undefined>;

const verifier = CognitoJwtVerifier.fromEnvironment();

/**
 * Temporary compatibility adapter for the inherited Lambda entrypoints.
 * Authentication remains asynchronous because Cognito signing keys are remote.
 */
export default class Authorization {
  static async authenticate(headers: Headers): Promise<AuthenticatedPrincipal> {
    const authorization = Object.entries(headers).find(([name]) => name.toLowerCase() === 'authorization')?.[1];
    const selectedStoreId = Object.entries(headers).find(([name]) => name.toLowerCase() === 'x-wearly-store-id')?.[1];
    const principal = await verifier.verifyBearerToken(authorization);
    return authContainer
      .get<ResolveSelectedStoreContext>(authTypes.ResolveSelectedStoreContext)
      .execute(principal, selectedStoreId);
  }
}
