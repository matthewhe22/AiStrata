// Netlify Function: Stripe webhook receiver (no npm deps — verifies signature manually)
const crypto = require('crypto');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_API = 'https://api.stripe.com/v1';

function verifySignature(payload, header) {
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  const signedPayload = `${parts.t}.${payload}`;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 || ''));
}

async function stripeGet(path) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET}` }
  });
  return res.json();
}

async function updateIdentityUser(identity, userId, appMetadata) {
  await fetch(`${identity.url}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${identity.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ app_metadata: appMetadata })
  });
}

async function findUserByCustomerId(identity, customerId) {
  const res = await fetch(`${identity.url}/admin/users?per_page=200`, {
    headers: { Authorization: `Bearer ${identity.token}` }
  });
  const data = await res.json();
  const users = Array.isArray(data) ? data : data.users || [];
  return users.find((u) => u.app_metadata && u.app_metadata.stripe_customer_id === customerId);
}

exports.handler = async (event, context) => {
  const identity = context.clientContext && context.clientContext.identity;
  if (!identity) {
    return { statusCode: 500, body: 'Identity not configured on this site' };
  }

  const signatureHeader = event.headers['stripe-signature'];
  if (!signatureHeader || !verifySignature(event.body, signatureHeader)) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  const stripeEvent = JSON.parse(event.body);
  const object = stripeEvent.data.object;

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const userId = object.client_reference_id || (object.metadata && object.metadata.identity_user_id);
        if (!userId) break;
        const subscription = await stripeGet(`/subscriptions/${object.subscription}`);
        await updateIdentityUser(identity, userId, {
          stripe_customer_id: object.customer,
          stripe_subscription_id: object.subscription,
          plan: (object.metadata && object.metadata.plan) || null,
          subscription_status: subscription.status
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const user = await findUserByCustomerId(identity, object.customer);
        if (!user) break;
        await updateIdentityUser(identity, user.id, {
          ...user.app_metadata,
          stripe_subscription_id: object.id,
          subscription_status: stripeEvent.type === 'customer.subscription.deleted' ? 'canceled' : object.status
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
