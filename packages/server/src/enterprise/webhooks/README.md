# Stripe Webhooks Setup

Simple webhook handler for Stripe subscription and payment events.

## Setup

1. Add environment variables to your `.env` file:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

2. In your Stripe Dashboard:
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/v1/webhooks/stripe`
   - Select events: `customer.subscription.deleted` and `invoice.payment_succeeded`
   - Copy the webhook signing secret to your `.env`

3. Apply raw body middleware before JSON parsing in your Express app:
```typescript
import { rawBodyMiddleware } from './enterprise/middleware/webhook.middleware'

app.use('/api/v1/webhooks', rawBodyMiddleware)
```

## Events Handled

- **customer.subscription.deleted** - When a subscription is cancelled
- **invoice.payment_succeeded** - When an invoice payment succeeds

## Customization

Edit the handler functions in `stripe.ts`:

```typescript
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  // Add your logic here
  // e.g., update database, send emails, revoke access
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Add your logic here
  // e.g., grant access, send confirmation, update quotas
}
```

## Testing

Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
```
