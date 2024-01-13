import React, { useEffect } from 'react'
const StripePricingTable = () => {
    useEffect(() => {
        console.log('StripePricingTable useEffect')
        const script = document.createElement('script')
        script.src = 'https://js.stripe.com/v3/pricing-table.js'
        script.async = true
        document.body.appendChild(script)
        return () => {
            document.body.removeChild(script)
        }
    }, [])
    return React.createElement('stripe-pricing-table', {
        'pricing-table-id': 'prctbl_1OY8r2CXAyRqT2HGB2ZKxcHs',
        'publishable-key': 'pk_test_51OY7bDCXAyRqT2HGc95qen8SDelmPliy5iSmHcHzqMWNPftkOGSaZCKyIXkcBZMRjczPZ2OqM6NkCfGWEdFHYDEg00NEmDQivg'
    })
}
export default StripePricingTable
