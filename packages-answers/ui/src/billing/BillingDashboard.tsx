'use client'

import React from 'react'
import { Box, Stack, Typography, CircularProgress, Button } from '@mui/material'
import { Link } from 'react-router-dom'
import TotalCreditsProgress from './TotalCreditsProgress'
import { useBillingData } from './hooks/useBillingData'
import BillingOverview from './BillingOverview'
import { useSubscriptionDialog } from '../SubscriptionDialogContext'

const BillingDashboard: React.FC = () => {
    const { billingData, isLoading, isError } = useBillingData()
    const { openDialog } = useSubscriptionDialog()

    // Calculate usage percentage
    const calculateUsagePercentage = () => {
        if (!billingData) return 0

        const totalUsed =
            (billingData.usageDashboard?.aiTokens?.used || 0) +
            (billingData.usageDashboard?.compute?.used || 0) +
            (billingData.usageDashboard?.storage?.used || 0)

        const totalLimit = billingData.currentPlan?.creditsIncluded || 10000
        return Math.min(Math.round((totalUsed / totalLimit) * 100), 100)
    }

    const usagePercentage = calculateUsagePercentage()

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (isError) {
        return (
            <Box sx={{ color: 'error.main' }}>
                <Typography>Failed to load billing information. Please try again later.</Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ p: { xs: 1, md: 4 } }}>
            <Box sx={{ mb: 2 }}>
                <Button component={Link} to='/admin' size='small' variant='text'>
                    ← Back to admin
                </Button>
            </Box>
            <Stack spacing={4}>
                <Box>
                    <Typography variant='h4' sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                        Usage Overview
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                        Manage your subscription and monitor your usage
                    </Typography>
                </Box>

                <TotalCreditsProgress usageSummary={billingData} isLoading={isLoading} isError={isError} />
                <BillingOverview
                    currentPlan={billingData?.currentPlan}
                    billingPeriod={billingData?.billingPeriod}
                    usagePercentage={usagePercentage}
                />
            </Stack>
        </Box>
    )
}

export default BillingDashboard
