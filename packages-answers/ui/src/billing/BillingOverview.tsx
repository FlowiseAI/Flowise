'use client'

import React, { useState } from 'react'
import { Box, Card, Typography, Button, Chip, Grid, Stack, Divider, useTheme, Alert, AlertTitle } from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'
import billingApi from '@/api/billing'

// Define BillingPlan interface here since we can't find the module
type PricingTierName = 'Free' | 'Plus' | 'Pro' | 'Plus+Overage'

interface BillingPlan {
    id?: string
    name: PricingTierName
    priceId?: string
    description?: string
    features?: string[]
    creditsIncluded: number
    pricePerMonth?: number
    highlighted?: boolean
    status?: 'active' | 'inactive' | 'past_due'
}

interface BillingOverviewProps {
    currentPlan?: BillingPlan
    billingPeriod?: {
        start: string
        end: string
    }
    nextBillingDate?: string
    status?: 'active' | 'inactive' | 'past_due'
    usagePercentage?: number
}

const BillingOverview: React.FC<BillingOverviewProps> = ({
    currentPlan,
    billingPeriod,
    nextBillingDate,
    status = 'active',
    usagePercentage = 0
}) => {
    const theme = useTheme()
    const [loading, setLoading] = useState(false)

    // Determine if we should show a warning (for free accounts at 80% or more usage)
    const showWarning = currentPlan?.name === 'Free' && usagePercentage >= 80

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return theme.palette.success.main
            case 'past_due':
                return theme.palette.error.main
            default:
                return 'rgba(255, 255, 255, 0.5)'
        }
    }

    // Handle direct checkout instead of opening dialog
    const handleUpgrade = async () => {
        setLoading(true)
        try {
            const response = await billingApi.createSubscription({
                priceId: 'price_1QdEegFeRAHyP6by6yTOvbwj' // Plus tier price ID
            })

            if (response.data?.url) {
                window.location.assign(response.data.url)
            }
        } catch (error) {
            console.error('Failed to initiate subscription:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {showWarning && (
                <Alert
                    severity='warning'
                    icon={<WarningIcon fontSize='inherit' />}
                    sx={{
                        mb: 3,
                        borderRadius: '12px',
                        bgcolor: 'rgba(255, 152, 0, 0.1)',
                        color: theme.palette.warning.light,
                        border: `1px solid ${theme.palette.warning.light}`,
                        '& .MuiAlert-icon': {
                            color: theme.palette.warning.light
                        }
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 600, color: theme.palette.warning.light }}>
                        You&apos;re approaching your usage limit
                    </AlertTitle>
                    <Typography sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
                        You&apos;ve used {usagePercentage}% of your free credits. When you reach 100%, some features may be limited. Upgrade
                        now to continue using all features without interruption.
                    </Typography>
                    <Button
                        variant='contained'
                        onClick={handleUpgrade}
                        disabled={loading}
                        sx={{
                            bgcolor: theme.palette.warning.main,
                            '&:hover': {
                                bgcolor: theme.palette.warning.dark
                            }
                        }}
                    >
                        Upgrade Now
                    </Button>
                </Alert>
            )}

            <Card
                elevation={0}
                sx={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(20px)',
                    p: 0
                }}
            >
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='h5' sx={{ fontWeight: 600, color: '#fff' }}>
                        Billing Overview
                    </Typography>
                    <Button
                        onClick={handleUpgrade}
                        disabled={loading}
                        variant='outlined'
                        sx={{
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            '&:hover': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                bgcolor: 'rgba(255, 255, 255, 0.05)'
                            }
                        }}
                    >
                        CHANGE PLAN
                    </Button>
                </Box>

                <Box sx={{ px: 3, pb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', mb: 0.5 }}>
                                        Current Plan
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant='h6' sx={{ color: '#fff', fontWeight: 600 }}>
                                            {currentPlan?.name || 'Free'}
                                        </Typography>
                                        <Chip
                                            label={status}
                                            size='small'
                                            sx={{
                                                bgcolor: `${getStatusColor(status)}20`,
                                                color: getStatusColor(status),
                                                borderRadius: '4px',
                                                height: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}
                                        />
                                    </Box>
                                </Box>
                                {currentPlan?.pricePerMonth && currentPlan.pricePerMonth > 0 && (
                                    <Box>
                                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', mb: 0.5 }}>
                                            Plan Cost
                                        </Typography>
                                        <Typography sx={{ color: '#fff' }}>${currentPlan.pricePerMonth}/month</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Stack spacing={2}>
                                {billingPeriod && (
                                    <Box>
                                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', mb: 0.5 }}>
                                            Current Period
                                        </Typography>
                                        <Typography sx={{ color: '#fff' }}>
                                            {new Date(billingPeriod.start).toLocaleDateString()} -{' '}
                                            {new Date(billingPeriod.end).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                )}
                                <Box>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', mb: 0.5 }}>
                                        Credits Included
                                    </Typography>
                                    <Typography sx={{ color: '#fff' }}>
                                        {currentPlan?.creditsIncluded === -1
                                            ? 'Unlimited'
                                            : currentPlan?.creditsIncluded.toLocaleString() || '10,000'}{' '}
                                        Credits/month
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                    <Box>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', mb: 1.5 }}>Plan Features</Typography>
                        <Grid container spacing={2}>
                            {currentPlan?.features &&
                                currentPlan.features.map((feature: string) => (
                                    <Grid item xs={12} sm={6} key={feature}>
                                        <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>• {feature}</Typography>
                                    </Grid>
                                ))}
                        </Grid>
                    </Box>
                </Box>
            </Card>
        </>
    )
}

export default BillingOverview
