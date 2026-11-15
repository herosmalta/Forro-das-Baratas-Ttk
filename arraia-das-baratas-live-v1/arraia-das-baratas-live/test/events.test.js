import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeChat,
  normalizeGift,
  normalizeLike,
  normalizeSocial,
  normalizeUser,
} from '../lib/tiktok-events.js';

test('identifica usuário pelo displayId e preserva nickname', () => {
  assert.deepEqual(normalizeUser({ user: { displayId: 'LuisJr', nickname: 'Luis' } }), {
    user: 'luisjr', name: 'Luis',
  });
});

test('normaliza comentário no formato atual (content)', () => {
  assert.deepEqual(normalizeChat({ user: { displayId: 'ana', nickname: 'Ana' }, content: '!pular' }), {
    type: 'chat', user: 'ana', name: 'Ana', text: '!pular',
  });
});

test('mantém compatibilidade com comentário antigo (comment)', () => {
  assert.equal(normalizeChat({ user: { uniqueId: 'beto' }, comment: 'oi' }).text, 'oi');
});

test('normaliza curtidas pelo campo count', () => {
  assert.deepEqual(normalizeLike({ user: { displayId: 'maria' }, count: 48, total: 900 }), {
    type: 'like', user: 'maria', name: 'maria', likes: 48,
  });
});

test('normaliza presente atual e calcula diamantes por unidade', () => {
  assert.deepEqual(normalizeGift({
    user: { displayId: 'joao', nickname: 'João' },
    gift: { type: 0, name: 'Rose', diamondCount: 1 },
    repeatCount: 3,
  }), {
    type: 'gift', user: 'joao', name: 'João', gift: 'Rose', diamonds: 1, count: 3,
  });
});

test('ignora atualizações intermediárias de presente em sequência', () => {
  assert.equal(normalizeGift({
    user: { displayId: 'joao' },
    gift: { type: 1, name: 'Rose', diamondCount: 1 },
    repeatCount: 4,
    repeatEnd: 0,
  }), null);
});

test('processa presente em sequência apenas quando termina', () => {
  const event = normalizeGift({
    user: { displayId: 'joao' },
    gift: { type: 1, name: 'Rose', diamondCount: 1 },
    repeatCount: 4,
    repeatEnd: 1,
  });
  assert.equal(event.count, 4);
  assert.equal(event.gift, 'Rose');
});

test('normaliza follow/share dedicados e fallback social', () => {
  assert.equal(normalizeSocial({ user: { displayId: 'ana' } }, 'follow').type, 'follow');
  assert.equal(normalizeSocial({ user: { displayId: 'beto' } }, 'share').type, 'share');
  assert.equal(normalizeSocial({ user: { displayId: 'carlos' }, displayType: 'shared the LIVE' }).type, 'share');
  assert.equal(normalizeSocial({ user: { displayId: 'duda' }, displayType: 'mensagem desconhecida' }), null);
});
