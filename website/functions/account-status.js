// Netlify Function: returns the signed-in user's live Stripe subscription status
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeGet(path) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET}` }
  });
  return res.json();
}

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Not signed in' }) };
  }

  const { stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, plan } = user.app_metadata || {};

  if (!customerId || !subscriptionId) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ hasSubscription: false })
    };
  }

  try {
    const subscription = await stripeGet(
      `/subscriptions/${subscriptionId}?expand[]=default_payment_method`
    );

    const paymentMethod = subscription.default_payment_method;

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        hasSubscription: true,
        plan,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cardLast4: paymentMethod && paymentMethod.card ? paymentMethod.card.last4 : null,
        customerId
      })
    };
  } catch (error) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
