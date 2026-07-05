// Netlify Function: cancels the signed-in user's own Stripe subscription (REST API, no npm deps)
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_API = 'https://api.stripe.com/v1';

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } };
  }

  const user = context.clientContext && context.clientContext.user;
  const subscriptionId = user && user.app_metadata && user.app_metadata.stripe_subscription_id;
  if (!subscriptionId) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'No active subscription' }) };
  }

  try {
    // Cancel at period end rather than immediately, so access continues until the paid-through date
    const params = new URLSearchParams({ cancel_at_period_end: 'true' });
    const response = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    if (data.error) {
      return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: data.error.message }) };
    }

    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, currentPeriodEnd: data.current_period_end }) };
  } catch (error) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
