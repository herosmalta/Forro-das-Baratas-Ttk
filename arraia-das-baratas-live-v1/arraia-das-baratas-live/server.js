import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeChat,
  normalizeGift,
  normalizeLike,
  normalizeSocial,
} from './lib/tiktok-events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const USER = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '').trim();

const clients = new Set();
const state = { ok: false, text: 'Iniciando servidor…', updatedAt: new Date().toISOString() };
const counters = { chat: 0, like: 0, gift: 0, follow: 0, share: 0 };
const seenSocial = new Map();
let connection = null;
let reconnectTimer = null;
let reconnectDelay = 5000;
let connecting = false;
let shuttingDown = false;

function send(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const response of clients) {
    if (response.destroyed || response.writableEnded) {
      clients.delete(response);
      continue;
    }
    try { response.write(payload); }
    catch { clients.delete(response); }
  }
}

function status(ok, text) {
  state.ok = Boolean(ok);
  state.text = text;
  state.updatedAt = new Date().toISOString();
  console.log(`${ok ? '[OK]' : '[INFO]'} ${text}`);
  send({ type: 'status', ok: state.ok, text: state.text });
}

function publish(event) {
  if (!event) return;
  if (Object.hasOwn(counters, event.type)) counters[event.type]++;
  send(event);
}

function shouldIgnoreSocial(event) {
  const key = `${event.type}:${event.user}`;
  const now = Date.now();
  const previous = seenSocial.get(key) || 0;
  if (now - previous < 1500) return true;
  seenSocial.set(key, now);
  if (seenSocial.size > 500) {
    for (const [item, time] of seenSocial) if (now - time > 30000) seenSocial.delete(item);
  }
  return false;
}

function attach(connectionInstance) {
  connectionInstance.on('chat', data => publish(normalizeChat(data)));
  connectionInstance.on('like', data => publish(normalizeLike(data)));
  connectionInstance.on('gift', data => publish(normalizeGift(data)));

  connectionInstance.on('follow', data => {
    const event = normalizeSocial(data, 'follow');
    if (event && !shouldIgnoreSocial(event)) publish(event);
  });
  connectionInstance.on('share', data => {
    const event = normalizeSocial(data, 'share');
    if (event && !shouldIgnoreSocial(event)) publish(event);
  });

  // Fallback para mensagens sociais antigas que não foram classificadas pelo conector.
  connectionInstance.on('social', data => {
    const event = normalizeSocial(data);
    if (event && !shouldIgnoreSocial(event)) publish(event);
  });

  connectionInstance.on('error', error => {
    const message = error?.message || String(error);
    console.error('[TikTok] Erro no fluxo:', message);
  });

  connectionInstance.on('disconnected', detail => {
    if (connection !== connectionInstance || shuttingDown) return;
    connection = null;
    const reason = detail?.reason || detail?.message || 'conexão interrompida';
    scheduleReconnect(`TikTok desconectou (${reason})`);
  });

  connectionInstance.on('streamEnd', () => {
    if (connection !== connectionInstance || shuttingDown) return;
    connection = null;
    // Fim/suspensão da live não deve disparar tentativas agressivas a cada poucos segundos.
    scheduleReconnect('A live terminou ou foi suspensa', 30000);
  });
}

function scheduleReconnect(reason, requestedDelay) {
  if (shuttingDown || reconnectTimer) return;
  const delay = requestedDelay ?? reconnectDelay;
  status(false, `${reason}. Nova tentativa em ${Math.ceil(delay / 1000)}s`);
  reconnectDelay = Math.min(Math.round(reconnectDelay * 1.7), 60000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectTikTok();
  }, delay);
  reconnectTimer.unref?.();
}

async function connectTikTok() {
  if (!USER) {
    status(false, 'Modo de teste: informe seu usuário TikTok para conectar. O simulador continua disponível.');
    return;
  }
  if (connecting || shuttingDown) return;
  connecting = true;
  status(false, `Conectando à live de @${USER}…`);

  let nextConnection;
  try {
    const { TikTokLiveConnection } = await import('tiktok-live-connector');
    nextConnection = new TikTokLiveConnection(USER, {
      processInitialData: false,
      fetchRoomInfoOnConnect: true,
      // Metadados extras são opcionais: desativados por padrão para não bloquear a conexão
      // quando a consulta de presentes falhar. Ative com ENABLE_EXTENDED_GIFT_INFO=true.
      enableExtendedGiftInfo: process.env.ENABLE_EXTENDED_GIFT_INFO === 'true',
      signApiKey: process.env.SIGN_API_KEY || undefined,
    });

    connection = nextConnection;
    attach(nextConnection);
    const connectedState = await nextConnection.connect();
    if (connection !== nextConnection || shuttingDown) return;

    reconnectDelay = 5000;
    const roomId = connectedState?.roomId || nextConnection.roomId;
    status(true, `Conectado à live de @${USER}${roomId ? ` (sala ${roomId})` : ''}`);
  } catch (error) {
    if (connection === nextConnection) connection = null;
    const message = error?.message || String(error);
    console.error('[TikTok] Não foi possível conectar:', message);
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      status(false, 'Biblioteca ausente. Feche o servidor, execute npm install e inicie novamente.');
    } else {
      scheduleReconnect(`Falha ao conectar à live: ${message}`);
    }
  } finally {
    connecting = false;
  }
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' });
    response.end('Method Not Allowed');
    return;
  }

  if (url.pathname === '/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders?.();
    response.write('retry: 2000\n\n');
    clients.add(response);
    response.write(`data: ${JSON.stringify({ type: 'status', ok: state.ok, text: state.text })}\n\n`);
    const keepAlive = setInterval(() => {
      if (!response.destroyed && !response.writableEnded) response.write(': keep-alive\n\n');
    }, 15000);
    request.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(response);
    });
    return;
  }

  if (url.pathname === '/health' || url.pathname === '/api/health') {
    sendJson(response, 200, {
      ok: state.ok,
      status: state.text,
      updatedAt: state.updatedAt,
      user: USER || null,
      clients: clients.size,
      events: { ...counters },
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (error, data) => {
      if (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Não foi possível carregar index.html');
        return;
      }
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      response.end(data);
    });
    return;
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Não encontrado');
});

server.on('error', error => {
  console.error('[Servidor] Erro:', error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`\nArraiá das Baratas: http://${HOST}:${PORT}`);
  console.log(`Overlay OBS: http://${HOST}:${PORT}/?panel=0&som=1`);
  console.log(`Diagnóstico: http://${HOST}:${PORT}/health\n`);
  connectTikTok();
});

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (connection) {
    try { await connection.disconnect(); }
    catch (error) { console.warn('[TikTok] Erro ao encerrar conexão:', error.message); }
  }
  for (const client of clients) client.end();
  clients.clear();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref?.();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
