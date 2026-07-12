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
  });
});
