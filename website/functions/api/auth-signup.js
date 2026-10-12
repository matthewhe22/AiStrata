// POST /api/auth-signup — creates an account and signs the user straight in.
import {
  usersStore, emailIndexStore, hashPassword, createSessionCookie, newUserId,
  publicUser, json, badMethod,
} from './_lib/auth.js';

export const onRequestPost = async ({ request, env }) => {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, password, fullName } = payload || {};

  if (!email || !password || String(password).length < 8) {
    return json({ error: 'Email and an 8+ character password are required' }, 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailIndex = emailIndexStore(env);

  const existingUserId = await emailIndex.get(normalizedEmail);
  if (existingUserId) {
    return json({ error: 'An account with that email already exists' }, 409);
  }

  const userId = newUserId();
  const { salt, hash } = hashPassword(String(password));

  const user = {
    id: userId,
    email: normalizedEmail,
    fullName: fullName || '',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: null,
    subscription_status: null,
    cancel_at_period_end: false,
  };

  await usersStore(env).put(userId, user);
  await emailIndex.put(normalizedEmail, userId);

  return json({ user: publicUser(user) }, 200, {
    'Set-Cookie': createSessionCookie(userId, env),
  });
};

export const onRequestOptions = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
});

export const onRequestGet = () => badMethod();
