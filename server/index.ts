import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  DB_PATH,
  isCollectionName,
  readState,
  writeCollection,
  writeSettings
} from './db.ts';

const app = express();

// Quotes embed a full cost breakdown, so allow a generous body.
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: DB_PATH });
});

app.get('/api/state', (_req, res) => {
  res.json(readState());
});

app.put('/api/settings', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Se esperaba un objeto de configuración' });
    return;
  }
  writeSettings(body);
  res.json({ ok: true });
});

app.put('/api/collections/:name', (req, res) => {
  const { name } = req.params;
  if (!isCollectionName(name)) {
    res.status(404).json({ error: `Colección desconocida: ${name}` });
    return;
  }
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: 'Se esperaba un arreglo' });
    return;
  }
  writeCollection(name, req.body);
  res.json({ ok: true, count: req.body.length });
});

// Unknown API routes must not fall through to the SPA shell.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada' });
});

// In production the same process serves the built frontend.
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[printcore] error:', error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno' });
});

function readPort(): number {
  const flagIndex = process.argv.indexOf('--port');
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) {
    const parsed = Number(process.argv[flagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const fromEnv = Number(process.env.PORT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 3000;
}

const port = readPort();

app.listen(port, () => {
  console.log(`[printcore] API en http://localhost:${port}`);
  console.log(`[printcore] Base de datos: ${DB_PATH}`);
  if (!fs.existsSync(distDir)) {
    console.log('[printcore] Sin dist/ — en desarrollo el frontend lo sirve Vite en el puerto 3000');
  }
});
