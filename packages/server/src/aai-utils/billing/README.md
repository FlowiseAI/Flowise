# Billing System Configuration

This document outlines the billing system configuration for the Flowise platform.

## Overview

The billing system is based on a "Sparks" credit system, where users consume Sparks for various resource usages:

-   AI Token consumption
-   Compute time
-   Storage usage

## Configuration

The billing configuration is centralized in `config.ts` and uses environment variables for sensitive values.

### Environment Variables

| Variable                    | Description                            | Default                       |
| --------------------------- | -------------------------------------- | ----------------------------- |
| `SPARK_PRICE_USD`           | Base price per Spark in USD            | 0.00004 ($20 for 500k Sparks) |
| `BILLING_MARGIN_MULTIPLIER` | Margin multiplier for billing          | 1.2 (20% margin)              |
| `PRO_PLAN_SPARKS`           | Number of Sparks included in Pro plan  | 500000                        |
| `FREE_PLAN_SPARKS`          | Number of Sparks included in Free plan | 10000                         |
| `STRIPE_SECRET_KEY`         | Stripe API secret key                  | -                             |
| `STRIPE_SPARKS_METER_ID`    | Stripe meter ID for Sparks             | -                             |
| `STRIPE_FREE_PRICE_ID`      | Stripe price ID for Free plan          | -                             |
| `STRIPE_PAID_PRICE_ID`      | Stripe price ID for Paid plan          | -                             |

### Resource Allocation

Resources are allocated as a percentage of the total Sparks included in a plan:

-   AI Tokens: 50% of total Sparks
-   Compute: 30% of total Sparks
-   Storage: 20% of total Sparks

### Conversion Rates

| Resource  | Unit         | Sparks     | Cost ($) |
| --------- | ------------ | ---------- | -------- |
| AI Tokens | 1,000 tokens | 100 Sparks | $0.004   |
| Compute   | 1 minute     | 50 Sparks  | $0.002   |
| Storage   | 1 GB/month   | 500 Sparks | $0.02    |

## Plans

| Plan | Sparks  | Price     | Features       |
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

-   AI Tokens: `tokens / 10 = Sparks`
-   Compute: `minutes * 50 = Sparks`
-   Storage: `GB * 500 = Sparks`

Total cost is calculated as: `Sparks * SPARK_PRICE_USD`
