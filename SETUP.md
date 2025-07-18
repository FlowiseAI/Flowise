# Stripe Setup for Prediction Credits System

This document provides step-by-step instructions to configure Stripe for implementing prediction credits using Stripe's metered billing and Credit Grants system.

## Overview

The credits implementation uses:
- **Billing Meters** for tracking prediction overages beyond plan limits
- **Metered Pricing** at $0.01 per prediction overage
- **Credit Grants** that automatically apply to metered billing charges
- **Prepackaged credit amounts** (1000 credits = $10.00)

## Prerequisites

- Existing Stripe account with subscription billing configured
- Active subscriptions with monthly plans
- Customers with default payment methods set up

## Manual Setup Guide

### Step 1: Create Credit Product and Packages

#### 1.1 Create the Credits Product

1. Navigate to **Products** in your Stripe Dashboard
2. Click **+ Add product**
3. Configure the product:
   - **Name**: `Credits`
   - **Description**: `Prediction Credits for AI Platform`
   - **Type**: Service
4. Click **Save product**
5. Copy the Product ID (starts with `prod_`) - you'll need this for `CREDIT_PRODUCT_ID`

#### 1.2 Add Credit Package Pricing

Create one-time prices for each credit package:

**Small Package (1000 credits = $10.00):**
1. In your Credits product, click **+ Add pricing**
2. Configure the price:
   - **Pricing model**: One-time
   - **Price**: $10.00 USD
   - **Description**: `1000 Credits Package`
3. Click **Save price**

### Step 2: Create Billing Meter for Prediction Overages

#### 2.1 Create the Meter

1. Navigate to **Billing > Meters** in your Stripe Dashboard
2. Click **+ Create meter**
3. Configure the meter:
   - **Meter name**: `Prediction Requests Overage`
   - **Event name**: `prediction_request_overage`
   - **Aggregation**: `Sum`
   - **Value settings**: 
     - **Default aggregation**: `Sum`
     - **Value name**: `value`
   - **Display name**: `Prediction Requests Overage`
4. Click **Create meter**
5. Copy the Meter ID (starts with `mtr_`) - you'll need this for `BILLING_METER_ID`

### Step 3: Create Metered Price for Overage Billing

#### 3.1 Create the Metered Price

1. Navigate to **Products** in your Stripe Dashboard
2. Click **+ Add product**
3. Configure the product:
   - **Name**: `Prediction Overage`
   - **Description**: `Metered billing for prediction requests beyond plan limits`
   - **Type**: Service
4. Click **Save product**
5. In the new product, click **+ Add pricing**
6. Configure the metered price:
   - **Pricing model**: Recurring
   - **Billing period**: Monthly
   - **Usage type**: Metered
   - **Billing scheme**: Per unit
   - **Price per unit**: $0.01 USD
   - **Meter**: Select the meter you created in Step 2
   - **Description**: `$0.01 per prediction overage`
7. Click **Save price**
8. Copy the Price ID (starts with `price_`) - you'll need this for `METERED_PRICE_ID`

### Step 4: Configure Environment Variables

Add these environment variables to your `.env` file:

```bash
# Required - Core Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                # Your Stripe secret key

# Required - Credit Product Configuration  
CREDIT_PRODUCT_ID=prod_xxxxxxxxxx           # Product ID from Step 1

# Required - Metered Billing Configuration
BILLING_METER_ID=mtr_xxxxxxxxxx             # Meter ID from Step 2
METERED_PRICE_ID=price_xxxxxxxxxx           # Metered price ID from Step 3
METER_EVENT_NAME=prediction_request_overage  # Must match meter event name

# Optional - Additional Seats (if using)
ADDITIONAL_SEAT_ID=prod_xxxxxxxxxx          # Product ID for additional seats
```

### Step 5: Restart Your Application

```bash
# Restart your application to load new environment variables
npm run dev  # For development
```

## Verification Checklist

- [ ] Credit product created with one-time pricing packages
- [ ] Billing meter created with event name `prediction_request_overage`
- [ ] Metered price created at $0.01 per prediction
- [ ] Environment variables configured correctly:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `CREDIT_PRODUCT_ID`
  - [ ] `BILLING_METER_ID`
  - [ ] `METERED_PRICE_ID`
  - [ ] `METER_EVENT_NAME`
- [ ] Application restarted with new configuration