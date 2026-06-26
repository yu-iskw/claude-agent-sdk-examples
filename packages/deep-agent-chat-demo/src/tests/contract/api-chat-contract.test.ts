import express from 'express';
import { describe, expect, it } from 'vitest';
import { registerApiRoutes } from '../../server/http/apiRoutes.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  registerApiRoutes(app);
  return app;
}

async function requestJson(
  app: express.Express,
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
) {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind test server');
  }
  const port = address.port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, text, headers: response.headers };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('api chat contract', () => {
  it('GET /api/health returns ok', async () => {
    const app = createTestApp();
    const { status, text } = await requestJson(app, '/api/health');
    expect(status).toBe(200);
    expect(JSON.parse(text)).toEqual({ ok: true });
  });

  it('rejects execute without sessionId', async () => {
    const app = createTestApp();
    const { status, text } = await requestJson(app, '/api/chat', {
      method: 'POST',
      body: { phase: 'execute', message: '', history: [] },
    });
    expect(status).toBe(400);
    expect(JSON.parse(text).error).toContain('sessionId');
  });
});
