// POST /api/auth-login — verifies credentials and sets the session cookie.
import {
  emailIndexStore, usersStore, verifyPassword, createSessionCookie,
  publicUser, json, badMethod,
} from './_lib/auth.js';

export const onRequestPost = async ({ request, env }) => {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, password } = payload || {};
  if (!email || !password) {
    return json({ error: 'Email and password are required' }, 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const userId = await emailIndexStore(env).get(normalizedEmail);
  const user = userId ? await usersStore(env).get(userId) : null;

  if (!user || !verifyPassword(String(password), user.passwordSalt, user.passwordHash)) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  return json({ user: publicUser(user) }, 200, {
    'Set-Cookie': createSessionCookie(user.id, env),
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
