# Revised Credits Implementation Plan

## Understanding Stripe Credit Grants Correctly

After reviewing the documentation, Credit Grants can **only** be applied to:
- Subscription line items that use **metered prices**
- Usage reported through **Meters**
- **Cannot** be applied to one-off payments

## Correct Architecture

### Current State
- Customers have subscriptions with base prediction limits (e.g., 1000 predictions/month)
- When they exceed limits, we currently throw an error

### New Architecture with Credit Grants

#### 1. Subscription Structure Changes
Each customer subscription needs:
- **Base Plan Item**: Existing subscription (Starter/Pro) with base prediction limit
- **Overage Meter Item**: New metered price for "additional predictions" (e.g., $0.01 per prediction)

#### 2. Credit Purchase Flow
Instead of one-off payments:
1. Customer initiates credit purchase (e.g., 1000 credits for $10)
2. Create a **Credit Grant** for the customer (1000 credits worth $10)
3. Credits are now available to offset future overage charges

#### 3. Prediction Flow
1. Check base subscription limit (existing logic)
2. If exceeded:
   - Report usage to "additional predictions" meter
   - This creates a charge on next invoice
   - Credit Grants automatically offset these charges
   - Allow the prediction to proceed

#### 4. Billing Flow
- Monthly invoice includes:
  - Base subscription charge
  - Overage charges from meter (if any)
  - Credit Grant offsets (automatic)
  - Net amount customer pays

## Implementation Details

### Required Stripe Setup

#### 1. Create Overage Meter
```
Meter Name: "Additional Predictions"
Event Name: "additional_prediction"
Aggregation: Sum
```

#### 2. Create Overage Price
```
Product: "Additional Predictions"
Price: $0.01 per unit
Billing: Usage-based (metered)
Meter: "Additional Predictions"
```

#### 3. Update Subscriptions
Add the overage price as a subscription item to all existing subscriptions.

### Code Changes

#### 1. Enhanced quotaUsage.ts
```typescript
export const checkPredictions = async (orgId: string, subscriptionId: string, usageCacheManager: UsageCacheManager) => {
    // ... existing logic for base limit check
    
    if (currentPredictions >= predictionsLimit) {
        // Report overage usage to Stripe meter
        const stripeManager = await StripeManager.getInstance()
        await stripeManager.reportOverageUsage(customerId, 1)
        
        // Allow prediction (will be charged, but credits can offset)
        return {
            usage: currentPredictions,
            limit: predictionsLimit,
            overageUsed: true,
            message: 'Overage prediction allowed (will be billed or offset by credits)'
        }
    }
}
```

#### 2. Credit Purchase API
```typescript
// Instead of checkout sessions, create Credit Grants directly
public async purchaseCredits(customerId: string, creditAmount: number, paymentAmount: number) {
    // Create Credit Grant
    const creditGrant = await stripe.billing.creditGrants.create({
        customer: customerId,
        amount: {
            value: paymentAmount * 100, // in cents
            currency: 'usd'
        },
        name: `${creditAmount} Credits Purchase`
    })
    
    // Still need payment collection - could use Payment Intents
    const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentAmount * 100,
        currency: 'usd',
        customer: customerId,
        metadata: {
            credit_grant_id: creditGrant.id
        }
    })
    
    return { paymentIntent, creditGrant }
}
```

#### 3. Subscription Management
```typescript
// Add overage price to existing subscriptions
public async addOveragePriceToSubscription(subscriptionId: string) {
    await stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                price: process.env.OVERAGE_PRICE_ID,
                quantity: 1
            }
        ],
        proration_behavior: 'none' // Don't charge immediately
    })
}
```

## Benefits of This Approach

### 1. True Credit System
- Credits automatically offset charges
- Transparent billing on invoices
- Stripe handles all accounting

### 2. Flexible Pricing
- Can adjust overage rates easily
- Credits can be promotional or paid
- Works with existing subscription model

### 3. Better UX
- No hard limits (with credits)
- Clear billing transparency
- Unified invoice experience

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Create overage meter and price in Stripe
2. Add overage price to all existing subscriptions
3. Deploy code changes

### Phase 2: Credit Purchase
1. Build credit purchase UI
2. Test credit grant creation
3. Validate payment collection

### Phase 3: Usage Reporting
1. Update prediction logic to report overage
2. Test meter event creation
3. Validate credit application

### Phase 4: Full Integration
1. End-to-end testing
2. Customer communication
3. Monitoring and analytics

## Key Considerations

### 1. Pricing Strategy
- Overage rate should be higher than credit cost to incentive credit purchases
- Example: $0.01 per overage prediction, but credits cost $0.008 per prediction

### 2. Credit Purchase Payment
- Since Credit Grants can't be tied to one-off payments directly
- Need separate payment collection (Payment Intents)
- Link payment to credit grant via metadata

### 3. Customer Communication
- Clear explanation of new billing model
- Show credit balance in UI
- Transparent overage charges

### 4. Subscription Management
- All subscriptions need overage price item
- Handle subscription updates carefully
- Consider proration implications

## Environment Variables Needed

```bash
# Stripe IDs for overage billing
STRIPE_OVERAGE_METER_ID=mtr_xxxxx
STRIPE_OVERAGE_PRICE_ID=price_xxxxx

# Credit purchase settings
CREDIT_PACKAGES=1000:10,5000:40,10000:75
```

## API Endpoints

```
POST /api/v1/organization/purchase-credits
GET  /api/v1/organization/credits-balance
GET  /api/v1/organization/credits-history
GET  /api/v1/organization/overage-usage
```

This revised approach correctly leverages Stripe Credit Grants by integrating them with subscription-based metered billing, ensuring compliance with Stripe's requirements while providing a seamless credit system.