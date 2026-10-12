// POST /api/cancel-subscription — cancels the signed-in user's own Stripe subscription.
// Cancels at period end so access continues until the paid-through date.
import { requireUser, json } from './_lib/auth.js';

const STRIPE_API = 'https://api.stripe.com/v1';

export const onRequestPost = async ({ request, env }) => {
  const user = await requireUser(request, env);
  const subscriptionId = user && user.stripe_subscription_id;
  if (!subscriptionId) return json({ error: 'No active subscription' }, 401);

  try {
    const params = new URLSearchParams({ cancel_at_period_end: 'true' });
    const response = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (data.error) return json({ error: data.error.message }, 500);

    return json({ success: true, currentPeriodEnd: data.current_period_end });
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
