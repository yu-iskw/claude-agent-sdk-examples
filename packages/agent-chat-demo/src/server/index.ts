import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { clientBuildDir, serverPort } from './config.js';
import { registerApiRoutes } from './http/apiRoutes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

registerApiRoutes(app);

if (fs.existsSync(clientBuildDir)) {
  app.use(express.static(clientBuildDir));
  // SPA fallback: serve the client entry for any non-API route.
  // Express 5 + path-to-regexp rejects legacy string wildcard patterns.
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientBuildDir, 'index.html'));
  });
}

app.listen(serverPort, () => {
  console.log(`agent-chat-demo server listening on http://localhost:${serverPort}`);
});
