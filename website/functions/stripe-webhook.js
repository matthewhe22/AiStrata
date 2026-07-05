// Netlify Function: Stripe webhook receiver (no npm deps — verifies signature manually)
const crypto = require('crypto');
const { usersStore, stripeIndexStore } = require('./lib/auth');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_API = 'https://api.stripe.com/v1';

function verifySignature(payload, header) {
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(parts.v1);
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function stripeGet(path) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET}` }
  });
  return res.json();
}

exports.handler = async (event) => {
  const signatureHeader = event.headers['stripe-signature'];
  if (!signatureHeader || !verifySignature(event.body, signatureHeader)) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  const stripeEvent = JSON.parse(event.body);
  const object = stripeEvent.data.object;
  const users = usersStore();
  const stripeIndex = stripeIndexStore();

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const userId = object.client_reference_id || (object.metadata && object.metadata.user_id);
        if (!userId) break;
        const user = await users.get(userId, { type: 'json' });
        if (!user) break;

        const subscription = await stripeGet(`/subscriptions/${object.subscription}`);

        await users.setJSON(userId, {
          ...user,
          stripe_customer_id: object.customer,
          stripe_subscription_id: object.subscription,
          plan: (object.metadata && object.metadata.plan) || user.plan,
          subscription_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end
        });
        await stripeIndex.set(object.customer, userId);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const userId = await stripeIndex.get(object.customer);
        if (!userId) break;
        const user = await users.get(userId, { type: 'json' });
        if (!user) break;

        await users.setJSON(userId, {
          ...user,
          stripe_subscription_id: object.id,
          subscription_status: stripeEvent.type === 'customer.subscription.deleted' ? 'canceled' : object.status,
          cancel_at_period_end: object.cancel_at_period_end || false
        });
        break;
      }

      default:
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
