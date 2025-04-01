# Billing System Configuration

This document outlines the billing system configuration for the Flowise platform.

## Overview

The billing system is based on a "Credits" credit system, where users consume Credits for various resource usages:

-   AI Token consumption
-   Compute time
-   Storage usage

## Configuration

The billing configuration is centralized in `config.ts` and uses environment variables for sensitive values.

### Environment Variables

| Variable                    | Description                             | Default                        |
| --------------------------- | --------------------------------------- | ------------------------------ |
| `BILLING_CREDIT_PRICE_USD`          | Base price per Credit in USD            | 0.00004 ($20 for 500k Credits) |
| `BILLING_MARGIN_MULTIPLIER` | Margin multiplier for billing           | 1.2 (20% margin)               |
| `BILLING_PRO_PLAN_CREDITS`          | Number of Credits included in Pro plan  | 500000                         |
| `BILLING_FREE_PLAN_CREDITS`         | Number of Credits included in Free plan | 10000                          |
| `BILLING_STRIPE_SECRET_KEY`         | Stripe API secret key                   | -                              |
| `STRIPE_CREDITS_METER_ID`   | Stripe meter ID for Credits             | -                              |
| `STRIPE_FREE_PRICE_ID`      | Stripe price ID for Free plan           | -                              |
| `BILLING_STRIPE_PAID_PRICE_ID`      | Stripe price ID for Paid plan           | -                              |

### Resource Allocation

Resources are allocated as a percentage of the total Credits included in a plan:

-   AI Tokens: 50% of total Credits
-   Compute: 30% of total Credits
-   Storage: 20% of total Credits

### Conversion Rates

| Resource  | Unit         | Credits     | Cost ($) |
| --------- | ------------ | ----------- | -------- |
| AI Tokens | 1,000 tokens | 100 Credits | $0.004   |
| Compute   | 1 minute     | 50 Credits  | $0.002   |
| Storage   | 1 GB/month   | 500 Credits | $0.02    |

## Plans

| Plan | Credits | Price     | Features       |
| ---- | ------- | --------- | -------------- |
| Free | 10,000  | $0        | Basic features |
| Pro  | 500,000 | $20/month | All features   |

## Implementation Details

The billing system is implemented using Stripe for payment processing and subscription management. Usage is tracked using Stripe's metered billing feature.

### Key Components

1. **Billing Configuration** (`config.ts`): Central configuration for billing parameters
2. **Stripe Provider** (`stripe/StripeProvider.ts`): Implementation of billing operations using Stripe
3. **Billing Controller** (`controllers/billing/index.ts`): API endpoints for billing operations
4. **Usage Tracking** (`services/billing.ts`): Service for tracking resource usage

## Usage Calculation

Usage is calculated based on the following formulas:

-   AI Tokens: `tokens / 10 = Credits`
-   Compute: `minutes * 50 = Credits`
-   Storage: `GB * 500 = Credits`

Total cost is calculated as: `Credits * BILLING_CREDIT_PRICE_USD`
