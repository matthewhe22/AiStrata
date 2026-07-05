const { clearSessionCookie } = require('./lib/auth');

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Set-Cookie': clearSessionCookie()
  },
  body: JSON.stringify({ success: true })
});
