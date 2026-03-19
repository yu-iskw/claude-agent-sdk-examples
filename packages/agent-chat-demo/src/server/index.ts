import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { ChatRequest } from '../shared/chat.js';
import { runChat } from './agent-runner.js';
import { clientBuildDir, serverPort } from './config.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  const body = req.body as Partial<ChatRequest>;

  if (!body.message || !body.mode || !Array.isArray(body.history)) {
    res.status(400).json({ error: 'Expected message, mode, and history.' });
    return;
  }

  try {
    const response = await runChat(body as ChatRequest);
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Claude Agent SDK error.';
    res.status(500).json({ error: message });
  }
});

if (fs.existsSync(clientBuildDir)) {
  app.use(express.static(clientBuildDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildDir, 'index.html'));
  });
}

app.listen(serverPort, () => {
  console.log(`agent-chat-demo server listening on http://localhost:${serverPort}`);
});
