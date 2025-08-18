'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, Container } from '@mui/material'

const BillingDashboard = dynamic(() => import('@ui/billing/BillingDashboard'), { ssr: false })
const CostCalculator = dynamic(() => import('@ui/billing/CostCalculator'), { ssr: false })
const UsageEventsTable = dynamic(() => import('@ui/billing/UsageEventsTable'), { ssr: false })

const Page = () => {
    return (
        <Container maxWidth='xl'>
            <Box sx={{ py: 4, p: 2 }}>
                <BillingDashboard />
                <Box sx={{ mt: 2 }}>
                    <UsageEventsTable />
                </Box>
                <Box sx={{ mt: 4 }}>
                    <CostCalculator />
                </Box>
            </Box>
        </Container>
    )
}

export default Page
