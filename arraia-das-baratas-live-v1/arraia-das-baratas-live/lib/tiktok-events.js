// Normaliza os payloads do TikTok LIVE Connector para o formato consumido pelo jogo.
// Mantém fallbacks para payloads da API antiga (v1/v2 inicial).

function asText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function firstText(...values) {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return '';
}

function positiveInt(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

export function normalizeUser(data = {}) {
  const user = data.user || data.author || data;
  const displayId = firstText(
    user.displayId,
    user.uniqueId,
    user.unique_id,
    data.displayId,
    data.uniqueId,
    data.unique_id
  );
  const id = firstText(user.id, user.userId, user.user_id, data.userId, data.user_id);
  const key = firstText(displayId, id, 'anon').replace(/^@/, '').toLowerCase();
  const name = firstText(user.nickname, user.displayName, user.display_name, displayId, id, 'anônimo');
  return { user: key, name };
}

export function normalizeChat(data = {}) {
  const identity = normalizeUser(data);
  const text = asText(data.content ?? data.comment ?? data.text ?? data.message);
  if (!text || identity.user === 'anon') return null;
  return { type: 'chat', ...identity, text };
}

export function normalizeLike(data = {}) {
  const identity = normalizeUser(data);
  if (identity.user === 'anon') return null;
  const likes = positiveInt(data.count ?? data.likeCount ?? data.like_count, 0);
  if (!likes) return null;
  return { type: 'like', ...identity, likes };
}

export function normalizeGift(data = {}) {
  const identity = normalizeUser(data);
  if (identity.user === 'anon') return null;

  const gift = data.gift || {};
  const extended = data.extendedGiftInfo || data.giftDetails || data.extended_gift_info || {};
  const giftType = Number(gift.type ?? extended.giftType ?? data.giftType ?? data.gift_type ?? -1);
  const repeatEnd = data.repeatEnd === true || Number(data.repeatEnd ?? data.repeat_end) === 1;

  // Presentes de sequência emitem atualizações cumulativas. Processamos apenas a final.
  if (giftType === 1 && !repeatEnd) return null;

  const giftName = firstText(
    gift.name,
    extended.name,
    extended.giftName,
    data.giftName,
    data.gift_name,
    data.giftId ? `Presente ${data.giftId}` : ''
  ) || 'Presente';
  const diamonds = positiveInt(
    gift.diamondCount ?? extended.diamondCount ?? data.diamondCount ?? data.diamond_count,
    1
  );
  const count = positiveInt(data.repeatCount ?? data.repeat_count ?? gift.repeatCount, 1);

  return { type: 'gift', ...identity, gift: giftName, diamonds, count };
}

function socialText(data = {}) {
  const common = data.publicAreaMessageCommon || data.public_area_message_common || {};
  const nestedCommon = data.common || common.common || {};
  const displayText = nestedCommon.displayText || nestedCommon.display_text || common.displayText || {};
  return [
    data.displayType,
    data.label,
    data.action,
    data.shareType,
    data.share_type,
    data.actionText,
    data.action_text,
    displayText.key,
    displayText.defaultFormat,
    displayText.default_format,
    common.displayType,
  ].map(asText).join(' ').toLowerCase();
}

export function normalizeSocial(data = {}, forcedType = '') {
  const identity = normalizeUser(data);
  if (identity.user === 'anon') return null;
  let type = forcedType;
  if (!type) {
    const hint = socialText(data);
    if (/follow|followed|seguiu|começou a seguir/.test(hint)) type = 'follow';
    else if (/share|shared|compartil|compartilhou/.test(hint)) type = 'share';
  }
  if (type !== 'follow' && type !== 'share') return null;
  return { type, ...identity };
}
