const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const body = JSON.parse(event.body);
  
  switch (event.path) {
    case '/.netlify/functions/create-checkout-session':
      return createCheckoutSession(body);
    case '/.netlify/functions/create-portal-link':
      return createPortalLink(body);
    case '/.netlify/functions/cancel-subscription':
      return cancelSubscription(body);
    default:
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
      };
  }
};

async function createCheckoutSession(body) {
  const { plan, email } = body;
  
  const prices = {
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH
  };
  
  const priceId = prices[plan];
  
  if (!priceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid plan' })
    };
  }
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL}/success.html`,
      cancel_url: `${process.env.BASE_URL}/cancel.html`,
      customer_email: email,
      metadata: {
        plan: plan
      }
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function createPortalLink(body) {
  const { customerId } = body;
  
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.BASE_URL}/portal.html`,
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url: portalSession.url })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function cancelSubscription(body) {
  const { subscriptionId } = body;
  
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
