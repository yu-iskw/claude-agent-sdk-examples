import type { Express, Response } from 'express';
import type { ChatRequest } from '../../shared/chat.js';
import { runChat } from '../agent-runner.js';

function writeSseData(res: Response, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function registerApiRoutes(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req, res) => {
    const body = req.body as Partial<ChatRequest>;

    if (typeof body.message !== 'string' || !Array.isArray(body.history)) {
      res.status(400).json({ error: 'Expected message (string) and history (array).' });
      return;
    }

    if (body.phase !== 'plan' && body.phase !== 'execute') {
      res.status(400).json({ error: 'Expected phase: "plan" or "execute".' });
      return;
    }

    if (body.phase === 'execute' && (!body.sessionId || typeof body.sessionId !== 'string')) {
      res.status(400).json({ error: 'execute phase requires sessionId from the plan phase.' });
      return;
    }

    const request = body as ChatRequest;
    const accept = req.get('accept') ?? '';
    const wantsEventStream = accept.includes('text/event-stream');

    if (wantsEventStream) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      try {
        const response = await runChat(request, {
          emitActivity: (event) => {
            writeSseData(res, { type: 'activity', event });
          },
        });
        writeSseData(res, { type: 'done', response });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Claude Agent SDK error.';
        writeSseData(res, { type: 'error', error: message });
      }
      res.end();
      return;
    }

    try {
      const response = await runChat(request);
      res.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Claude Agent SDK error.';
      res.status(500).json({ error: message });
    }
  });
}
