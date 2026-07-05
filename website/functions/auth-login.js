const { usersStore, emailIndexStore, verifyPassword, createSessionCookie } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password } = JSON.parse(event.body || '{}');
  if (!email || !password) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Email and password are required' })
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userId = await emailIndexStore().get(normalizedEmail);
  const user = userId ? await usersStore().get(userId, { type: 'json' }) : null;

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid email or password' })
    };
  }

  const { passwordSalt, passwordHash, ...publicUser } = user;

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Set-Cookie': createSessionCookie(user.id)
    },
    body: JSON.stringify({ user: publicUser })
  };
};
