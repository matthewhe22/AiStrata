const { requireUser } = require('./lib/auth');

exports.handler = async (event) => {
  const user = await requireUser(event);
  if (!user) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Not signed in' }) };
  }

  const { passwordSalt, passwordHash, ...publicUser } = user;
  return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ user: publicUser }) };
};
