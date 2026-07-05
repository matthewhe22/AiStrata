// Netlify Function: create-checkout-session
// Uses Stripe REST API (no npm deps required)
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'https://strataflow.work';
const STRIPE_API = 'https://api.stripe.com/v1';

// Stripe Price IDs - update these in Stripe Dashboard
const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_STARTER_ID',
  growth: process.env.STRIPE_PRICE_GROWTH || 'price_GROWTH_ID'
};

exports.handler = async (event, context) => {
  // CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Please sign in first' })
    };
  }

  try {
    const { plan } = JSON.parse(event.body);
    const priceId = PRICES[plan];

    if (!priceId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid plan' })
      };
    }

    // Create Stripe Checkout Session via REST API
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${BASE_URL}/success.html`,
      'cancel_url': `${BASE_URL}/cancel.html`,
      'customer_email': user.email || '',
      'client_reference_id': user.sub,
      'metadata[plan]': plan,
      'metadata[identity_user_id]': user.sub
    });

    const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error.message })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ sessionId: data.id, url: data.url })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
