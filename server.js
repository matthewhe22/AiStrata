require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const path = require('path');

app.use(express.static('.'));
app.use(express.json());

// Create Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  const { plan, email } = req.body;
  
  const prices = {
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH
  };
  
  const priceId = prices[plan];
  
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan' });
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
    
    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Customer Portal Session
app.post('/api/create-portal-link', async (req, res) => {
  const { customerId } = req.body;
  
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.BASE_URL}/portal.html`,
    });
    
    res.json({ url: portalSession.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Subscription
app.post('/api/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;
  
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook for Stripe events
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      const subscription = event.data.object;
      console.log('New subscription created:', subscription.customer);
      break;
    case 'customer.subscription.updated':
      const updated = event.data.object;
      console.log('Subscription updated:', updated.id);
      break;
    case 'customer.subscription.deleted':
      const deleted = event.data.object;
      console.log('Subscription cancelled:', deleted.id);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Payment succeeded:', invoice.id);
      break;
    case 'invoice.payment_failed':
      const failed = event.data.object;
      console.log('Payment failed:', failed.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({received: true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
