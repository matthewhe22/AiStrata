// GET /api/account-status — live Stripe subscription status for the signed-in user.
import { requireUser, json } from './_lib/auth.js';

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeGet(path, secret) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return res.json();
}

export const onRequestGet = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'Not signed in' }, 401);

  const {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan,
  } = user;

  if (!customerId || !subscriptionId) {
    return json({ hasSubscription: false });
  }

  try {
    const subscription = await stripeGet(
      `/subscriptions/${subscriptionId}?expand[]=default_payment_method`,
      env.STRIPE_SECRET_KEY
    );

    if (subscription.error) {
      return json({ hasSubscription: false, error: subscription.error.message });
    }

    const paymentMethod = subscription.default_payment_method;

    return json({
      hasSubscription: true,
      plan,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cardLast4: paymentMethod && paymentMethod.card ? paymentMethod.card.last4 : null,
      customerId,
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
