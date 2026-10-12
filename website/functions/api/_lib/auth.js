// Shared session + password helpers for the StrataFlow Pages Functions.
//
// Ported from the Netlify version. Two changes:
//   1. Storage is Cloudflare KV (binding SF_KV) instead of @netlify/blobs.
//      One namespace, key-prefixed: users:<id> / email:<email> / stripe:<customerId>
//   2. Handlers receive a Pages `context` (context.request, context.env) and
//      return a Response, instead of a Netlify event/handler pair.
//
// Password hashing stays scrypt with the same {salt, hash} hex shape so any
// credentials created before the migration remain valid.

import {
  scryptSync, randomBytes, randomUUID, createHmac, timingSafeEqual,
} from 'node:crypto';

export const SESSION_COOKIE = 'sf_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const K_USERS = 'users:';
const K_EMAIL = 'email:';
const K_STRIPE = 'stripe:';

// ---------------------------------------------------------------- responses

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function preflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function badMethod() {
  return json({ error: 'Method Not Allowed' }, 405);
}

// ---------------------------------------------------------------- KV stores

function kv(env) {
  const store = env && env.SF_KV;
  if (!store) {
    throw new Error(
      'KV binding SF_KV is missing. Bind a KV namespace to the Pages project ' +
      '(deployment_configs.<env>.kv_namespaces).'
    );
  }
  return store;
}

export const usersStore = (env) => ({
  get: (id) => kv(env).get(K_USERS + id, 'json'),
  put: (id, obj) => kv(env).put(K_USERS + id, JSON.stringify(obj)),
});

export const emailIndexStore = (env) => ({
  get: (email) => kv(env).get(K_EMAIL + email),
  put: (email, userId) => kv(env).put(K_EMAIL + email, userId),
});

export const stripeIndexStore = (env) => ({
  get: (customerId) => kv(env).get(K_STRIPE + customerId),
  put: (customerId, userId) => kv(env).put(K_STRIPE + customerId, userId),
});

// ---------------------------------------------------------------- passwords

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  try {
    const { hash } = hashPassword(password, salt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const newUserId = () => randomUUID();

// ---------------------------------------------------------------- sessions

function sign(payload, env) {
  const secret = (env && env.SESSION_SECRET) || 'dev-only-insecure-secret';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionCookie(userId, env) {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const encoded = Buffer.from(payload).toString('base64url');
  const value = `${encoded}.${sign(encoded, env)}`;
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie() {
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

export function getUserIdFromRequest(request, env) {
  const cookies = parseCookies(request.headers.get('cookie'));
  const value = cookies[SESSION_COOKIE];
  if (!value) return null;

  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return null;

  const expected = sign(encoded, env);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export async function requireUser(request, env) {
  const userId = getUserIdFromRequest(request, env);
  if (!userId) return null;
  return usersStore(env).get(userId);
}

export function publicUser(user) {
  const { passwordSalt, passwordHash, ...rest } = user;
  return rest;
}
