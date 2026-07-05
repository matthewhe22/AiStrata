// Shared session + password helpers for the custom auth functions.
// No external deps beyond @netlify/blobs — password hashing uses Node's built-in scrypt.
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE = 'sf_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function usersStore() {
  return getStore('users');
}

function emailIndexStore() {
  return getStore('users-by-email');
}

function stripeIndexStore() {
  return getStore('stripe-customer-index');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}

function createSessionCookie(userId) {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const encoded = Buffer.from(payload).toString('base64url');
  const signature = sign(encoded);
  const value = `${encoded}.${signature}`;
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    cookies[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return cookies;
}

function getUserIdFromRequest(event) {
  const cookies = parseCookies(event.headers.cookie);
  const value = cookies[SESSION_COOKIE];
  if (!value) return null;

  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

async function requireUser(event) {
  const userId = getUserIdFromRequest(event);
  if (!userId) return null;
  const store = usersStore();
  const user = await store.get(userId, { type: 'json' });
  return user;
}

module.exports = {
  usersStore,
  emailIndexStore,
  stripeIndexStore,
  hashPassword,
  verifyPassword,
  createSessionCookie,
  clearSessionCookie,
  getUserIdFromRequest,
  requireUser
};
