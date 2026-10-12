// POST /api/auth-logout — clears the session cookie.
import { clearSessionCookie, json } from './_lib/auth.js';

export const onRequestPost = () => json({ success: true }, 200, {
  'Set-Cookie': clearSessionCookie(),
});

// Without a GET handler, Pages falls through to the static-asset lookup and
// returns the 404 page instead of a method error. Be explicit.
export const onRequestGet = () => json({ error: 'Method Not Allowed' }, 405);

export const onRequestOptions = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
});
