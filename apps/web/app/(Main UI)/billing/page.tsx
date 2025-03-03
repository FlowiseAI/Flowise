'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, Container } from '@mui/material'

const BillingDashboard = dynamic(() => import('@ui/billing/BillingDashboard'), { ssr: false })
const PurchaseCredits = dynamic(() => import('@ui/billing/PurchaseCredits'), { ssr: false })
const CostCalculator = dynamic(() => import('@ui/billing/CostCalculator'), { ssr: false })
const PurchaseSubscription = dynamic(() => import('@ui/billing/PurchaseSubscription'), { ssr: false })

const Page = () => {
    return (
        <Container maxWidth='xl'>
            <Box sx={{ py: 4 }}>
                <BillingDashboard />
                {/* <Box sx={{ mt: 4 }}>
                    <PurchaseCredits />
                </Box> */}
                <Box sx={{ mt: 4 }}>
                    <CostCalculator />
                </Box>
                {/* <Box sx={{ mt: 4 }}>
                    <PurchaseSubscription />
                </Box> */}
            </Box>
        </Container>
    )
}

export default Page
