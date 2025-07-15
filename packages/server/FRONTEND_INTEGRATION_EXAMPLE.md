# Frontend Integration Example for Credits

This shows how to integrate credit purchases with the existing PricingDialog pattern.

## API Integration

### 1. Purchase Credits API Call

```javascript
// In your existing dialog component
const purchaseCredits = async (creditPackage) => {
  try {
    setLoading(true)
    
    const response = await fetch('/api/v1/organization/purchase-credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        package: creditPackage // "1000", "5000", or "10000"
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to purchase credits')
    }
    
    // Handle different response types
    if (result.success) {
      // Payment successful - credits added
      showSuccess(`Successfully purchased ${result.creditAmount} credits!`)
      onSuccess?.()
      onClose()
    } else if (result.requiresAction) {
      // 3D Secure authentication required
      await handlePaymentAuthentication(result)
    } else if (result.paymentFailed) {
      // Payment failed - show error, no credits added
      throw new Error(result.paymentError?.message || 'Payment failed')
    }
    
  } catch (error) {
    console.error('Credit purchase failed:', error)
    showError(error.message)
  } finally {
    setLoading(false)
  }
}

// Handle 3D Secure authentication if needed
const handlePaymentAuthentication = async (result) => {
  const stripe = await stripePromise
  
  const { error } = await stripe.confirmPayment({
    clientSecret: result.clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/credits/success`
    }
  })
  
  if (error) {
    throw new Error(error.message)
  }
}
```

### 2. Check Credits Balance

```javascript
const getCreditsBalance = async () => {
  try {
    const response = await fetch('/api/v1/organization/credits-balance', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const balance = await response.json()
    
    return {
      available: balance.available_balance,
      totalPurchased: balance.total_purchased,
      totalConsumed: balance.total_consumed
    }
  } catch (error) {
    console.error('Failed to get credits balance:', error)
    return { available: 0, totalPurchased: 0, totalConsumed: 0 }
  }
}
```

## React Component Example

```jsx
import React, { useState, useEffect } from 'react'
import { Button, Dialog, DialogTitle, DialogContent, Alert } from '@mui/material'

const CreditsPurchaseDialog = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creditsBalance, setCreditsBalance] = useState(0)

  const creditPackages = [
    { id: '1000', amount: 1000, price: 10, popular: false },
    { id: '5000', amount: 5000, price: 40, popular: true },
    { id: '10000', amount: 10000, price: 75, popular: false }
  ]

  useEffect(() => {
    if (open) {
      loadCreditsBalance()
    }
  }, [open])

  const loadCreditsBalance = async () => {
    const balance = await getCreditsBalance()
    setCreditsBalance(balance.available)
  }

  const handlePurchase = async (packageId) => {
    setError('')
    await purchaseCredits(packageId)
  }

  const purchaseCredits = async (creditPackage) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/v1/organization/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ package: creditPackage })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase credits')
      }
      
      if (result.success) {
        onSuccess?.()
        onClose()
        // Refresh balance or show success message
      } else if (result.requiresAction) {
        // Handle 3D Secure if needed
        setError('Additional authentication required. Please contact support.')
      } else if (result.paymentFailed) {
        throw new Error(result.paymentError?.message || 'Payment failed')
      }
      
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Purchase Credits</DialogTitle>
      <DialogContent>
        <div className="mb-4">
          <p>Current balance: <strong>{creditsBalance} credits</strong></p>
        </div>
        
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        <div className="space-y-3">
          {creditPackages.map((pkg) => (
            <div 
              key={pkg.id}
              className={`border rounded-lg p-4 ${pkg.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">
                    {pkg.amount.toLocaleString()} Credits
                    {pkg.popular && (
                      <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                        Most Popular
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600">
                    ${(pkg.price / pkg.amount * 1000).toFixed(1)} per 1000 credits
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${pkg.price}</div>
                  <Button
                    variant={pkg.popular ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={loading}
                    size="small"
                  >
                    {loading ? 'Processing...' : 'Purchase'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Credits are used when you exceed your subscription prediction limits</p>
          <p>• Credits don't expire and roll over each month</p>
          <p>• Secure payment processing via Stripe</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreditsPurchaseDialog
```

## Integration with Existing Pricing Flow

```jsx
// In your existing PricingDialog or subscription management component
import CreditsPurchaseDialog from './CreditsPurchaseDialog'

const PricingDialog = () => {
  const [showCreditsDialog, setShowCreditsDialog] = useState(false)
  
  return (
    <>
      {/* Your existing subscription plans */}
      <div className="subscription-plans">
        {/* ... existing plan cards ... */}
      </div>
      
      {/* Add credits section */}
      <div className="credits-section mt-6">
        <h3>Need more predictions?</h3>
        <p>Purchase credits to use when you exceed your plan limits</p>
        <Button 
          variant="outlined" 
          onClick={() => setShowCreditsDialog(true)}
        >
          Buy Credits
        </Button>
      </div>
      
      <CreditsPurchaseDialog
        open={showCreditsDialog}
        onClose={() => setShowCreditsDialog(false)}
        onSuccess={() => {
          // Refresh credits balance or show success message
          console.log('Credits purchased successfully!')
        }}
      />
    </>
  )
}
```

## Error Handling

```javascript
// Common error scenarios and handling
const handleCreditPurchaseError = (error, result) => {
  if (result?.paymentFailed) {
    // Payment specifically failed - show payment error
    if (result.paymentError?.code === 'card_declined') {
      return 'Your payment was declined. Please try a different payment method.'
    }
    return result.paymentError?.message || 'Payment failed. Please try again.'
  }
  
  // General API errors
  if (error.message.includes('Subscription ID is required')) {
    return 'No active subscription found. Please subscribe to a plan first.'
  }
  
  if (error.message.includes('Customer ID not found')) {
    return 'Unable to process payment. Please contact support.'
  }
  
  return error.message || 'An unexpected error occurred. Please try again.'
}
```

## Key Benefits of This Approach

1. **Simple Integration**: One API call handles everything
2. **Immediate Feedback**: Success/failure known immediately
3. **Secure**: No credits created on payment failure
4. **Familiar Pattern**: Follows same structure as existing subscription updates
5. **Error Handling**: Clear error messages for different failure scenarios
6. **No Webhook Dependency**: Everything happens synchronously

This approach integrates seamlessly with your existing PricingDialog pattern while maintaining the security and reliability of the credit purchase flow.