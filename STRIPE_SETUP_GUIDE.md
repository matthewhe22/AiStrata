# StrataFlow — Stripe Integration Setup Guide

> Complete guide to connecting Stripe subscriptions to your StrataFlow website

---

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete KYC verification
3. Get your API keys from Dashboard → Developers → API Keys

## Step 2: Create Products in Stripe Dashboard

### Pricing Plans

| Plan | Price | Frequency | Description |
|------|-------|-----------|-------------|
| Starter | $500 AUD | Monthly | Basic automation for small strata managers |
| Growth | $1,000 AUD | Monthly | Advanced AI features for growing portfolios |
| Enterprise | Custom | Monthly | Full customization and priority support |

### How to Create Products

1. Go to **Stripe Dashboard → Products → Add Product**
2. Create "Starter Plan":
   - Name: StrataFlow Starter
   - Price: $500/month
   - Description: Basic strata automation for small managers
3. Create "Growth Plan":
   - Name: StrataFlow Growth
   - Price: $1,000/month
   - Description: Advanced AI features and priority support
4. Create "Enterprise Plan":
   - Name: StrataFlow Enterprise
   - Price: Custom (contact sales)
   - Description: Full customization and dedicated support

## Step 3: Update Configuration Files

### Update `index.html`

Find this section near the bottom of `index.html`:

```javascript
// Stripe Configuration
const STRIPE_CONFIG = {
    publishableKey: 'pk_live_YOUR_PUBLISHABLE_KEY',
    prices: {
        starter: 'price_YOUR_STARTER_PRICE_ID',
        growth: 'price_YOUR_GROWTH_PRICE_ID',
        enterprise: 'enterprise'
    }
};
```

Replace with your actual Stripe keys and price IDs.

### Update `package.json`

Ensure your dependencies are up to date:

```json
{
  "dependencies": {
    "stripe": "^14.0.0",
    "express": "^4.18.2",
    "dotenv": "^16.0.0"
  }
}
```

## Step 4: Deploy to Netlify

### Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy your site
cd ~/Documents/strataflows
netlify deploy --prod
```

### Manual Deployment

1. Zip your site folder
2. Go to [app.netlify.com](https://app.netlify.com)
3. Drag and drop your zip file
4. Configure custom domain (strataflows.com.au)
5. Set up SSL certificate

## Step 5: Configure Webhooks

### Create Webhook Endpoint

In your `server.js`, ensure you have:

```javascript
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.WEBHOOK_SECRET);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            // Send welcome email
            break;
        case 'invoice.payment_succeeded':
            // Send receipt
            break;
        case 'customer.subscription.deleted':
            // Handle cancellation
            break;
    }
    
    res.json({received: true});
});
```

### Register Webhook in Stripe Dashboard

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add Endpoint**
3. Set URL to: `https://strataflows.com.au/webhook`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
5. Copy the signing secret to your `.env` file

## Step 6: Email Configuration

### SMTP Settings

Update your `.env` file:

```env
SMTP_HOST=smtp.strataflows.com.au
SMTP_PORT=587
SMTP_USER=hello@strataflows.com.au
SMTP_PASSWORD=your_secure_password
```

### Email Templates

Create these email templates in `templates/`:

1. `welcome.html` - New user registration
2. `invoice.html` - Payment receipt
3. `subscription.html` - Subscription confirmation
4. `cancel.html` - Cancellation confirmation

## Step 7: Testing

### Test Payment Flow

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

2. Verify:
   - Checkout redirects correctly
   - Success/cancel pages display
   - Webhooks trigger properly
   - Emails send successfully

## Step 8: Go Live

### Switch to Live Keys

1. Update `STRIPE_PUBLISHABLE_KEY` with live key
2. Update `STRIPE_SECRET_KEY` with live key
3. Update webhook URL to production endpoint
4. Test with real payment (then refund)

### Domain Setup

1. Purchase `strataflows.com.au` (~$15/year)
2. Configure DNS in Netlify:
   - Add custom domain
   - Update nameservers
   - Wait for propagation (24-48 hours)

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Webhook signature invalid | Check signing secret matches |
| Payment fails | Verify price IDs are correct |
| Email not sending | Check SMTP credentials |
| Deploy fails | Ensure all files are included |

### Getting Help

- **Stripe Support**: https://stripe.com/support
- **Netlify Support**: https://answers.netlify.com
- **Documentation**: See README.md in project root
