// Servidor da live: conecta no chat/presentes do TikTok e repassa pro jogo (index.html).
// Uso:  node server.js SEU_USUARIO_TIKTOK     (a live precisa estar ligada)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const USER = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '');
if (!USER) {
  console.log('Uso: node server.js SEU_USUARIO_TIKTOK   (sem o @)');
  process.exit(1);
}

let lib;
try { lib = require('tiktok-live-connector'); }
catch (e) { console.error('Faltou instalar as dependências. Rode: npm install'); process.exit(1); }

// v2 usa TikTokLiveConnection; v1 usa WebcastPushConnection
const Conn = lib.TikTokLiveConnection || lib.WebcastPushConnection;

/* ---------- servidor web + SSE ---------- */
const clients = new Set();
function send(obj) {
  const msg = `data: ${JSON.stringify(obj)}\n\n`;
  for (const c of clients) c.write(msg);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/events')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 2000\n\n');
    clients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'status', ok: state.ok, text: state.text })}\n\n`);
    const ka = setInterval(() => res.write(': ka\n\n'), 15000);
    req.on('close', () => { clearInterval(ka); clients.delete(res); });
    return;
  }
  const file = path.join(__dirname, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('index.html não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

const state = { ok: false, text: 'Conectando ao TikTok…' };
function status(ok, text) {
  state.ok = ok; state.text = text;
  console.log((ok ? '[OK] ' : '[..] ') + text);
  send({ type: 'status', ok, text });
}

/* ---------- normalização dos eventos ---------- */
const who = d => ({
  user: String((d.user && d.user.uniqueId) || d.uniqueId || 'anon'),
  name: String((d.user && d.user.nickname) || d.nickname || (d.user && d.user.uniqueId) || d.uniqueId || 'anon'),
});

const seen = new Map();
function dedupe(key, ms = 3000) {
  const now = Date.now();
  if (seen.has(key) && now - seen.get(key) < ms) return true;
  seen.set(key, now);
  if (seen.size > 500) for (const [k, t] of seen) if (now - t > ms) seen.delete(k);
  return false;
}

function attach(conn) {
  conn.on('chat', d => send({ type: 'chat', ...who(d), text: d.comment || '' }));

  conn.on('gift', d => {
    const g = d.giftDetails || d.extendedGiftInfo || {};
    const type = g.giftType ?? d.giftType;
    if (type === 1 && !d.repeatEnd) return; // sequência de presentes ainda rolando: espera terminar
    const diamonds = Number(g.diamondCount ?? d.diamondCount ?? 0) || 1;
    const count = Number(d.repeatCount || (d.gift && d.gift.repeat_count) || 1) || 1;
    const name = g.giftName || d.giftName || `presente ${d.giftId}`;
    send({ type: 'gift', ...who(d), gift: name, diamonds, count });
  });

  conn.on('like', d => send({ type: 'like', ...who(d), likes: Number(d.likeCount) || 1 }));

  conn.on('follow', d => { const w = who(d); if (!dedupe('f' + w.user)) send({ type: 'follow', ...w }); });
  conn.on('share', d => { const w = who(d); if (!dedupe('s' + w.user)) send({ type: 'share', ...w }); });
  // versões antigas mandam follow/share pelo evento "social"
  conn.on('social', d => {
    const t = String(d.displayType || d.label || '');
    const w = who(d);
    if (/follow/i.test(t) && !dedupe('f' + w.user)) send({ type: 'follow', ...w });
    else if (/share/i.test(t) && !dedupe('s' + w.user)) send({ type: 'share', ...w });
  });

  conn.on('error', e => console.error('Erro:', e && e.message ? e.message : e));
}

/* ---------- conexão com reconexão automática ---------- */
let wait = 5000;
async function start() {
  const conn = new Conn(USER, {
    enableExtendedGiftInfo: true,
    processInitialData: false,
    signApiKey: process.env.SIGN_API_KEY || undefined,
  });
  attach(conn);
  let retried = false;
  const retry = why => {
    if (retried) return; retried = true;
    status(false, `${why} — tentando de novo em ${Math.round(wait / 1000)}s`);
    setTimeout(start, wait);
    wait = Math.min(wait * 1.5, 60000);
  };
  conn.on('disconnected', () => retry('Desconectado'));
  conn.on('streamEnd', () => retry('A live terminou'));
  try {
    const s = await conn.connect();
    wait = 5000;
    status(true, `Conectado na live de @${USER}` + (s && s.roomId ? ` (sala ${s.roomId})` : ''));
  } catch (e) {
    retry('Não conectou (a live está ligada?): ' + (e && e.message ? e.message : e));
  }
}

server.listen(PORT, () => {
  console.log(`\nJogo rodando em  http://localhost:${PORT}`);
  console.log(`Para a live (sem painel): http://localhost:${PORT}/?panel=0\n`);
  start();
});
