import { afterAll, describe, expect, it } from 'vitest';
import { buildPlatformApp } from '@src/shared/presentation/http/buildPlatformApp';

describe('buildPlatformApp', () => {
  const app = buildPlatformApp();

  afterAll(async () => {
    await app.close();
  });

  it('serves the platform health endpoint under /api/v1', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: {
        'x-correlation-id': 'request-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('request-1');
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'wearly-services',
    });
  });

  it('uses the platform error shape for unknown routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/missing',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/v1/missing was not found.',
        details: [],
      },
    });
  });
});
