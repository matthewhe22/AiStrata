// POST /api/create-portal-link — Stripe billing portal session for the signed-in user.
import { requireUser, json } from './_lib/auth.js';

const STRIPE_API = 'https://api.stripe.com/v1';

export const onRequestPost = async ({ request, env }) => {
  const user = await requireUser(request, env);
  const customerId = user && user.stripe_customer_id;
  if (!customerId) return json({ error: 'No active subscription' }, 401);

  const baseUrl = env.BASE_URL || 'https://strataflow.work';

  try {
    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${baseUrl}/portal`,
    });

    const response = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (data.error) return json({ error: data.error.message }, 500);

    return json({ url: data.url });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};

export const onRequestOptions = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
});

// Without an explicit GET handler, Pages falls through to the static-asset
// lookup and serves the 404 page instead of a method error.
export const onRequestGet = () => json({ error: 'Method Not Allowed' }, 405);
