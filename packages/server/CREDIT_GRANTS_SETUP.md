# Credit Grants Setup Guide - Correct Implementation

This guide explains how to set up the credits-based pricing feature using Stripe Credit Grants with metered subscriptions.

## Prerequisites

1. Stripe account with access to the new Billing API (2024-10-28.acacia version)
2. Credit Grants feature enabled in your Stripe account
3. Existing Flowise setup with Stripe subscriptions

## Understanding Credit Grants Limitations

**IMPORTANT**: Credit Grants can ONLY be applied to:
- Subscription line items that use **metered prices**
- Usage reported through **Meters**
- **Cannot** be applied to one-off payments

## Architecture Overview

### Current State
- Customers have subscriptions with base prediction limits (e.g., 1000 predictions/month)
- When limits exceeded, system throws error

### New State with Credit Grants
- Customers still have base prediction limits
- When exceeded, system reports "overage usage" to a meter
- This creates charges on the subscription invoice
- Credit Grants automatically offset these charges
- Net result: seamless overage handling with transparent billing

## Stripe Dashboard Setup

### Step 1: Create Overage Meter

1. Go to **Billing > Meters** in Stripe Dashboard
2. Click **Create meter**
3. Configure:
   - **Meter name**: "Additional Predictions"
   - **Event name**: "additional_prediction"
   - **Aggregation method**: Sum
4. Save and copy the Meter ID

### Step 2: Create Overage Price

1. Go to **Products** in Stripe Dashboard
2. Create new product:
   - **Name**: "Additional Predictions"
   - **Description**: "Overage predictions beyond subscription limit"
3. Add price:
   - **Pricing model**: Usage-based
   - **Meter**: Select "Additional Predictions" meter
   - **Price**: $0.01 per unit (or your preferred rate)
   - **Billing period**: Same as your subscription billing
4. Save and copy the Price ID

### Step 3: Update Existing Subscriptions

Add the overage price to ALL existing customer subscriptions:

1. Go to each customer's subscription
2. Add the "Additional Predictions" price as a new subscription item
3. Set **Proration behavior** to "None" to avoid immediate charges

**Or use the API** (recommended for bulk updates):
```javascript
// Add overage price to all subscriptions
const subscriptions = await stripe.subscriptions.list({ status: 'active' });
for (const subscription of subscriptions.data) {
  await stripe.subscriptions.update(subscription.id, {
    items: [{
      price: 'price_xxxxx' // Your overage price ID
    }],
    proration_behavior: 'none'
  });
}
```

### Step 4: Configure Webhooks

Ensure your webhook endpoint handles:
- `billing.credit_grant.created` (for cache invalidation - optional)

Note: Credit purchases are handled synchronously, no webhooks required for payment processing.

## Environment Variables

Add these to your server configuration:

```bash
# Required: Overage billing configuration
STRIPE_OVERAGE_METER_ID=mtr_xxxxxxxxxxxxx
STRIPE_OVERAGE_PRICE_ID=price_xxxxxxxxxxxxx

# Optional: Debug logging
CREDIT_DEBUG=true
```

## API Flow

### Credit Purchase Flow

1. **Purchase Credits** (One synchronous API call):
   ```http
   POST /api/v1/organization/purchase-credits
   {
     "package": "1000"
   }
   ```
   
   **Success Response:**
   ```json
   {
     "success": true,
     "creditGrant": { ... },
     "paymentIntent": { ... },
     "creditAmount": 1000,
     "priceAmount": 10,
     "paymentFailed": false,
     "paymentError": null
   }
   ```

   **Payment Failed Response:**
   ```json
   {
     "success": false,
     "paymentFailed": true,
     "paymentError": { "message": "Payment declined" }
   }
   ```

   **Requires Action Response (3D Secure):**
   ```json
   {
     "success": false,
     "requiresAction": true,
     "paymentIntent": { ... },
     "clientSecret": "pi_xxxxx_secret_xxxxx",
     "creditAmount": 1000,
     "priceAmount": 10
   }
   ```

### Usage Flow

When user exceeds subscription limit:
1. System reports overage to Stripe meter
2. This creates charge on next invoice
3. Credit Grants automatically offset the charge
4. User continues seamlessly

### Check Balance

```http
GET /api/v1/organization/credits-balance
```

Response:
```json
{
  "available_balance": 850,
  "total_purchased": 1000,
  "total_consumed": 150
}
```

## Credit Packages

Default packages:

| Package | Credits | Price | Value per Credit |
|---------|---------|-------|------------------|
| 1000    | 1000    | $10   | $0.01           |
| 5000    | 5000    | $40   | $0.008          |
| 10000   | 10000   | $75   | $0.0075         |

## How Billing Works

### Monthly Invoice Example

```
Subscription: Pro Plan                    $50.00
Additional Predictions (150 units)        $1.50
Credit Grant Applied                      -$1.50
                                         -------
Total:                                    $50.00
```

### Key Points

- **Synchronous Processing**: Credits are created immediately upon successful payment
- **Payment Failure Handling**: If payment fails, NO credits are created (unlike subscription updates)
- **Overage Rate**: Set higher than credit purchase rate to incentivize credit buying
- **Transparent Billing**: All charges and credits visible on invoice
- **Automatic Application**: Credits apply automatically, no manual intervention
- **No Expiration**: Credits don't expire unless explicitly set

## Pricing Strategy

### Recommended Setup
- **Subscription Base Rate**: $X for Y predictions
- **Overage Rate**: $0.01 per additional prediction
- **Credit Rate**: $0.008 per credit (20% discount)

This encourages users to:
1. Purchase credits in advance (cheaper)
2. Avoid surprise overage charges
3. Have transparent usage costs

## Testing

### Test Credit Purchase
1. Create test customer with active subscription
2. Ensure overage price is added to subscription
3. Call purchase-credits API with test credit package
4. Verify response indicates success and Credit Grant creation
5. Test payment failure scenarios (declined cards)
6. Test overage usage triggers meter events

### Test Overage Usage
1. Set low prediction limit for test customer
2. Exceed the limit in your application
3. Verify meter events are reported
4. Check upcoming invoice shows overage charges
5. Verify credits offset the charges

## Troubleshooting

### Common Issues

1. **"STRIPE_OVERAGE_PRICE_ID not configured"**
   - Add the price ID to environment variables
   - Restart application

2. **"Subscription doesn't have overage price"**
   - Add overage price to customer's subscription
   - Use the `addOveragePriceToSubscription` method

3. **"Credits not applying to charges"**
   - Verify Credit Grant currency matches invoice currency
   - Check Credit Grant has available balance
   - Ensure charges are from metered subscription items

4. **"Meter events not being recorded"**
   - Verify STRIPE_OVERAGE_METER_ID is correct
   - Check customer ID is valid
   - Ensure meter event name matches meter configuration

### Debug Mode

Enable detailed logging:
```bash
CREDIT_DEBUG=true
```

This logs:
- Meter event creation
- Credit Grant operations
- Payment Intent processing
- Cache operations

## Migration Checklist

- [ ] Create overage meter in Stripe
- [ ] Create overage price in Stripe
- [ ] Add overage price to all existing subscriptions
- [ ] Deploy code changes
- [ ] Configure environment variables
- [ ] Test credit purchase flow (success/failure scenarios)
- [ ] Test overage usage flow
- [ ] Test existing PricingDialog integration
- [ ] Update customer documentation

## Security Considerations

1. **Synchronous Validation**: Payment and Credit Grant creation happen in same API call
2. **Payment Failure Handling**: No credits created if payment fails (secure by default)
3. **Customer Validation**: Ensure customer owns the organization before operations
4. **Rate Limiting**: Stripe has rate limits on meter events (1000/sec)
5. **Idempotency**: Use idempotency keys for critical operations
6. **3D Secure Support**: Handle authentication requirements gracefully

## Monitoring

### Key Metrics
- Credit purchase conversion rates
- Overage usage patterns
- Credit Grant application success
- Payment failure rates
- Meter event processing errors

### Alerts
- Credit purchase API failures
- High overage usage without credits
- Payment Intent failures
- Meter event API errors

This implementation correctly uses Stripe Credit Grants by integrating them with subscription-based metered billing, following the existing synchronous patterns used for subscription and seat updates, ensuring compliance with Stripe's requirements while providing a seamless credit system.