import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Lightweight Vercel Serverless endpoint for /api/auth/status.
 * Responds 200 OK without native SQLite bindings so Vercel deployments never
 * encounter 404 errors or native binary crashes, signaling the client to use
 * persistent standalone browser storage when no external Express API is set.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      backendMode: 'standalone',
    }),
  );
}
