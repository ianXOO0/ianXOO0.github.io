// Servidor de Sigo Firme: sirve la app y envía SMS reales a un familiar por Twilio.
// Sin dependencias. Requiere Node 18 o superior.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH = process.env.TWILIO_AUTH_TOKEN || '';
const FROM = process.env.TWILIO_FROM || '';
const FAMILY_PHONE = process.env.FAMILY_PHONE || '';
const API_TOKEN = process.env.API_TOKEN || '';
const DRY_RUN = process.env.DRY_RUN === '1';
const MAX_PER_HOUR = Number(process.env.MAX_ALERTS_PER_HOUR || 3);

if (!API_TOKEN || API_TOKEN.length < 12) {
  console.error('Falta API_TOKEN (mínimo 12 caracteres). Revisa .env.example.');
  process.exit(1);
}
if (!DRY_RUN && !(SID && AUTH && FROM && FAMILY_PHONE)) {
  console.error('Faltan datos de Twilio o FAMILY_PHONE. Usa DRY_RUN=1 para probar sin enviar.');
  process.exit(1);
}

// Archivos que se pueden servir. Nada más sale del disco.
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
};

const sent = []; // marcas de tiempo de avisos enviados
function rateLimited() {
  const now = Date.now();
  while (sent.length && now - sent[0] > 3600_000) sent.shift();
  return sent.length >= MAX_PER_HOUR;
}

function tokenOk(header) {
  const given = Buffer.from((header || '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(API_TOKEN);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

async function sendSms(body) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] SMS a ${FAMILY_PHONE || '(sin número)'}: ${body}`);
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(SID)}/Messages.json`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${SID}:${AUTH}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: FAMILY_PHONE, From: FROM, Body: body }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Twilio respondió ${r.status}: ${detail.slice(0, 300)}`);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/alert') {
    if (!tokenOk(req.headers.authorization)) return json(res, 401, { ok: false, error: 'unauthorized' });
    if (rateLimited()) return json(res, 429, { ok: false, error: 'rate_limited' });
    let data;
    try { data = JSON.parse(await readBody(req)); } catch { return json(res, 400, { ok: false, error: 'bad_request' }); }
    const message = typeof data.message === 'string' ? data.message.trim().slice(0, 300) : '';
    if (!message) return json(res, 400, { ok: false, error: 'empty_message' });
    try {
      await sendSms(`${message}\n(Aviso enviado desde Sigo Firme)`);
      sent.push(Date.now());
      return json(res, 200, { ok: true });
    } catch (e) {
      console.error('Error al enviar SMS:', e.message);
      return json(res, 502, { ok: false, error: 'send_failed' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, dryRun: DRY_RUN });

  if (req.method === 'GET' && STATIC[url.pathname]) {
    const [file, type] = STATIC[url.pathname];
    try {
      const buf = await readFile(path.join(DIR, file));
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': file === 'sw.js' ? 'no-cache' : 'public, max-age=300' });
      return res.end(buf);
    } catch {
      res.writeHead(404); return res.end('No encontrado');
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('No encontrado');
});

server.listen(PORT, () => {
  console.log(`Sigo Firme en http://localhost:${PORT}${DRY_RUN ? ' (modo prueba: no envía SMS reales)' : ''}`);
});
