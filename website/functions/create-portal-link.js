// Netlify Function: Stripe billing portal session for the signed-in user (REST API, no npm deps)
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'https://strataflow.work';
const STRIPE_API = 'https://api.stripe.com/v1';

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } };
  }

  const user = context.clientContext && context.clientContext.user;
  const customerId = user && user.app_metadata && user.app_metadata.stripe_customer_id;
  if (!customerId) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'No active subscription' }) };
  }

  try {
    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${BASE_URL}/portal.html`
    });

    const response = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    if (data.error) {
      return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: data.error.message }) };
    }

    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ url: data.url }) };
  } catch (error) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
