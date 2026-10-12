// POST /api/stripe-webhook — Stripe webhook receiver.
// Verifies the Stripe-Signature header manually (no npm SDK, no stripe package).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { usersStore, stripeIndexStore, json } from './_lib/auth.js';

const STRIPE_API = 'https://api.stripe.com/v1';

function verifySignature(payload, header, webhookSecret) {
  if (!header || !webhookSecret) return false;

  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  if (!parts.t || !parts.v1) return false;

  // Reject timestamps older than 5 minutes (replay protection).
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!Number.isFinite(age) || age > 300) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const expected = createHmac('sha256', webhookSecret).update(signedPayload, 'utf8').digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function stripeGet(path, secret) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return res.json();
}

export const onRequestPost = async ({ request, env }) => {
  // Signature is computed over the exact bytes Stripe sent — read the text first.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');

  if (!verifySignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 400 });
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  const object = stripeEvent.data.object;
  const users = usersStore(env);
  const stripeIndex = stripeIndexStore(env);

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const userId =
          object.client_reference_id || (object.metadata && object.metadata.user_id);
        if (!userId) break;

        const user = await users.get(userId);
        if (!user) break;

        const subscription = await stripeGet(
          `/subscriptions/${object.subscription}`,
          env.STRIPE_SECRET_KEY
        );

        await users.put(userId, {
          ...user,
          stripe_customer_id: object.customer,
          stripe_subscription_id: object.subscription,
          plan: (object.metadata && object.metadata.plan) || user.plan,
          subscription_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
        await stripeIndex.put(object.customer, userId);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const userId = await stripeIndex.get(object.customer);
        if (!userId) break;

        const user = await users.get(userId);
        if (!user) break;

        await users.put(userId, {
          ...user,
          stripe_subscription_id: object.id,
          subscription_status:
            stripeEvent.type === 'customer.subscription.deleted' ? 'canceled' : object.status,
          cancel_at_period_end: object.cancel_at_period_end || false,
        });
        break;
      }

      default:
        break;
    }

    return json({ received: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};

// Stripe calls this by POST only; be explicit so GET returns a method error
// rather than falling through to the static-asset 404 page.
export const onRequestGet = () => json({ error: 'Method Not Allowed' }, 405);
