import { Context } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { handler as listProducts } from '@src/app/modules/catalog/presentation/handlers/ListProductsEndpointHandler';
import { handler as listVariants } from '@src/app/modules/catalog/presentation/handlers/ListProductVariantsEndpointHandler';
import { handler as createQuote } from '@src/app/modules/sales/presentation/handlers/CreateCheckoutQuoteEndpointHandler';
import { handler as completeSale } from '@src/app/modules/sales/presentation/handlers/CompleteQuoteSaleEndpointHandler';
import { handler as getIdempotency } from '@src/app/modules/sales/presentation/handlers/GetSaleIdempotencyEndpointHandler';
import { handler as getSale } from '@src/app/modules/sales/presentation/handlers/GetSaleByIdEndpointHandler';
import { handler as getSession } from '@src/app/modules/auth/presentation/handlers/GetSessionEndpointHandler';
import { handler as selectStore } from '@src/app/modules/auth/presentation/handlers/SelectSessionStoreEndpointHandler';

const context = { awsRequestId: 'phase-4-contract' } as Context;

describe('Phase 4 Lambda endpoint contracts', () => {
  it.each([
    ['GET /products', listProducts, event({ queryStringParameters: { page: '0' } })],
    ['GET /variants', listVariants, event({ queryStringParameters: { pageSize: '101' } })],
    ['POST /checkout/quote', createQuote, event({ body: JSON.stringify({ items: [] }) })],
    ['POST /sales', completeSale, event({ body: JSON.stringify({ quoteId: 'quote', paymentMethod: 'CASH' }) })],
    ['GET /sales/idempotency/{key}', getIdempotency, event({ pathParameters: {} })],
    ['GET /sales/{id}', getSale, event({ pathParameters: {} })],
    ['POST /session/store', selectStore, event({ body: JSON.stringify({}) })],
  ])('%s returns the standard validation envelope before application execution', async (_route, handler, request) => {
    const response = await handler(request, context, {} as never);
    expect(response).toMatchObject({
      statusCode: 400,
      body: expect.stringContaining('VALIDATION_ERROR'),
    });
  });

  it('POST /sales rejects a non-UUID idempotency key before authentication', async () => {
    const response = await completeSale(
      event({
        headers: { 'idempotency-key': 'not-a-uuid' },
        body: JSON.stringify({ quoteId: 'quote', paymentMethod: 'CASH' }),
      }),
      context,
      {} as never
    );
    expect(response).toMatchObject({ statusCode: 400, body: expect.stringContaining('VALIDATION_ERROR') });
  });

  it('GET /session returns the standard unauthenticated envelope', async () => {
    const response = await getSession(event({}), context, {} as never);
    expect(response).toMatchObject({
      statusCode: 401,
      body: expect.stringContaining('UNAUTHENTICATED'),
    });
  });
});

function event(overrides: Record<string, unknown>) {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/api/v1/test',
    rawQueryString: '',
    headers: {},
    requestContext: {},
    isBase64Encoded: false,
    ...overrides,
  } as any;
}
