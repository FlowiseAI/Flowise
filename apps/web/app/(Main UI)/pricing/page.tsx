import React from 'react'
import dynamic from 'next/dynamic'
import PurchaseCredits from '@ui/billing/PurchaseCredits'
import PurchaseSubscription from '@ui/billing/PurchaseSubscription'

const PricingOverview = dynamic(() => import('@ui/billing/PricingOverview'), { ssr: true })
// const PurchaseCredits = dynamic(() => import('@ui/billing/PurchaseCredits'), { ssr: true })
const UsageStats = dynamic(() => import('@ui/billing/UsageStats'), { ssr: true })
const CostCalculator = dynamic(() => import('@ui/billing/CostCalculator'), { ssr: true })

const Page = () => {
    return (
        <>
            <PricingOverview />
            <PurchaseSubscription />
            <PurchaseCredits />
            <CostCalculator />
            {/* <PurchaseCredits /> */}
            <UsageStats />
        </>
    )
}

export default Page
