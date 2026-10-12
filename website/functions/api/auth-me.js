// GET /api/auth-me — returns the signed-in user, or 401.
import { requireUser, publicUser, json } from './_lib/auth.js';

export const onRequestGet = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'Not signed in' }, 401, { 'Cache-Control': 'no-store' });
  return json({ user: publicUser(user) });
};

export const onRequestOptions = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
});
