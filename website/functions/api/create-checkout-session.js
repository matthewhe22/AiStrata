// POST /api/create-checkout-session — Stripe Checkout via REST (no npm SDK).
import { requireUser, json, badMethod } from './_lib/auth.js';

const STRIPE_API = 'https://api.stripe.com/v1';

export const onRequestPost = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'Please sign in first' }, 401);

  const baseUrl = env.BASE_URL || 'https://strataflow.work';
  const prices = {
    starter: env.STRIPE_PRICE_STARTER,
    growth: env.STRIPE_PRICE_GROWTH,
    enterprise: env.STRIPE_PRICE_ENTERPRISE,
  };

  let plan;
  try {
    ({ plan } = await request.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const priceId = prices[plan];
  if (!priceId) return json({ error: 'Invalid plan' }, 400);

  try {
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
      customer_email: user.email || '',
      client_reference_id: user.id,
      'metadata[plan]': plan,
      'metadata[user_id]': user.id,
    });

    const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (data.error) return json({ error: data.error.message }, 500);

    return json({ sessionId: data.id, url: data.url });
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

export const onRequestGet = () => badMethod();
