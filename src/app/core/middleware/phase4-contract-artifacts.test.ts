import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();
const fixturesDirectory = join(repositoryRoot, 'docs/fixtures/phase-4');
const openApiPath = join(repositoryRoot, 'docs/openapi/phase-4.openapi.json');

describe('Phase 4 HTTP contract artifacts', () => {
  it('publishes all deterministic fixtures as valid JSON', () => {
    const fixtureNames = readdirSync(fixturesDirectory).filter((name) => name.endsWith('.json'));

    expect(fixtureNames).toEqual(
      expect.arrayContaining([
        'product-search-success.json',
        'variant-barcode-success.json',
        'quote-without-promotions-success.json',
        'quote-with-promotion-success.json',
        'sale-cash-success.json',
        'sale-idempotency-replay.json',
        'idempotency-completed.json',
        'idempotency-pending.json',
        'error-envelopes.json',
        'session-success.json',
      ])
    );

    for (const fixtureName of fixtureNames) {
      expect(() => JSON.parse(readFileSync(join(fixturesDirectory, fixtureName), 'utf8'))).not.toThrow();
    }
  });

  it('documents the stable Phase 4 failure envelope and error codes', () => {
    const openApi = JSON.parse(readFileSync(openApiPath, 'utf8'));
    const errorCode = openApi.components.schemas.ErrorEnvelope.properties.error.properties.code;

    expect(errorCode.enum).toEqual(
      expect.arrayContaining(['STALE_PRICING', 'INSUFFICIENT_STOCK', 'IDEMPOTENCY_CONFLICT'])
    );
    expect(openApi.paths['/api/v1/checkout/quote'].post.responses['409']).toEqual({
      $ref: '#/components/responses/Error',
    });
    expect(openApi.paths['/api/v1/sales'].post.parameters).toContainEqual({
      $ref: '#/components/parameters/IdempotencyKey',
    });
    expect(openApi.components.parameters.SelectedStore).toMatchObject({
      name: 'X-Wearly-Store-Id',
      in: 'header',
    });
  });

  it('publishes each Phase 4 endpoint with a success response and an error envelope', () => {
    const openApi = JSON.parse(readFileSync(openApiPath, 'utf8'));
    const requiredRoutes = [
      ['/api/v1/products', 'get'],
      ['/api/v1/variants', 'get'],
      ['/api/v1/checkout/quote', 'post'],
      ['/api/v1/sales', 'post'],
      ['/api/v1/sales/idempotency/{key}', 'get'],
      ['/api/v1/sales/{id}', 'get'],
      ['/api/v1/session', 'get'],
      ['/api/v1/session/store', 'post'],
    ] as const;

    for (const [path, method] of requiredRoutes) {
      const operation = openApi.paths[path][method];
      expect(operation.responses['200']).toBeDefined();
      expect(Object.values(operation.responses)).toContainEqual({ $ref: '#/components/responses/Error' });
    }
  });
});
