const crypto = require('crypto');
const { usersStore, emailIndexStore, hashPassword, createSessionCookie } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password, fullName } = JSON.parse(event.body || '{}');

  if (!email || !password || password.length < 8) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Email and an 8+ character password are required' })
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailIndex = emailIndexStore();
  const existingUserId = await emailIndex.get(normalizedEmail);
  if (existingUserId) {
    return {
      statusCode: 409,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'An account with that email already exists' })
    };
  }

  const userId = crypto.randomUUID();
  const { salt, hash } = hashPassword(password);

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
    cancel_at_period_end: false
  };

  await usersStore().setJSON(userId, user);
  await emailIndex.set(normalizedEmail, userId);

  const { passwordSalt, passwordHash, ...publicUser } = user;

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Set-Cookie': createSessionCookie(userId)
    },
    body: JSON.stringify({ user: publicUser })
  };
};
