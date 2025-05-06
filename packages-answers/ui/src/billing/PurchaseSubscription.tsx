'use client'

import { useState } from 'react'
import { Box, Card, Typography, Grid, Button, Stack, useTheme } from '@mui/material'
import { Check as CheckIcon, Bolt as CreditIcon } from '@mui/icons-material'
import billingApi from '@/api/billing'

interface SubscriptionTier {
    name: string
    creditsPerMonth: number
    price: number
    features: string[]
    priceId: string
    highlighted?: boolean
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
    {
        name: 'Free',
        creditsPerMonth: 10000,
        price: 0,
        priceId: 'price_free',
        features: [
            '10,000 Credits',
            'Access to GPT-4o, Claude 3.7 Sonnet, Gemini 1.5 Pro',
            'Access to Community Sidekicks',
            'Standard voice chats',
            'Basic compute and storage allocation',
            'Community support'
        ]
    },
    {
        name: 'Plus',
        creditsPerMonth: 500_000,
        price: 20,
        priceId: 'price_1QdEegFeRAHyP6by6yTOvbwj',
        highlighted: true,
        features: [
            '500,000 Credits per month',
            'Full API access',
            'Extended compute and storage limits',
            'Access to advanced voice chats',
            'Priority support',
            'Create and share custom Sidekicks',
            'Early access to new features'
        ]
    }
]

const PurchaseSubscription = () => {
    const theme = useTheme()
    const [loading, setLoading] = useState(false)

    const handleSubscribe = async (tier: SubscriptionTier) => {
        setLoading(true)
        try {
            const response = await billingApi.createSubscription({
                priceId: tier.priceId
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
        <Box sx={{ p: 3 }}>
            <Stack spacing={3} alignItems='center' sx={{ mb: 4 }}>
                <Typography variant='h4' sx={{ fontWeight: 600, textAlign: 'center' }}>
                    Upgrade your plan
                </Typography>

                {/* <ToggleButtonGroup
                    value={planType}
                    exclusive
                    onChange={handlePlanTypeChange}
                    sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        padding: '4px',
                        '& .MuiToggleButton-root': {
                            border: 'none',
                            borderRadius: '16px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            px: 3,
                            '&.Mui-selected': {
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                color: '#fff'
                            }
                        }
                    }}
                >
                    <ToggleButton value='personal'>Personal</ToggleButton>
                    <ToggleButton value='business'>Business</ToggleButton>
                </ToggleButtonGroup> */}
            </Stack>

            <Grid container spacing={2.5}>
                {SUBSCRIPTION_TIERS.map((tier) => (
                    <Grid item xs={12} md={6} key={tier.name}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 3,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                bgcolor: 'rgba(0, 0, 0, 0.2)',
                                backdropFilter: 'blur(20px)',
                                '&:hover': {
                                    borderColor: theme.palette.primary.main
                                }
                            }}
                        >
                            {tier.highlighted && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        bgcolor: theme.palette.primary.main,
                                        color: '#fff',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    POPULAR
                                </Box>
                            )}

                            <Stack spacing={3} sx={{ flex: 1 }}>
                                <Box>
                                    <Typography
                                        sx={{
                                            fontSize: '1.5rem',
                                            fontWeight: 600,
                                            color: '#fff',
                                            mb: 2
                                        }}
                                    >
                                        {tier.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                                        <Typography
                                            component='span'
                                            sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)', mr: 0.5 }}
                                        >
                                            $
                                        </Typography>
                                        <Typography
                                            component='span'
                                            sx={{
                                                fontSize: '3rem',
                                                fontWeight: 700,
                                                color: '#fff',
                                                lineHeight: 1
                                            }}
                                        >
                                            {tier.price}
                                        </Typography>
                                        <Typography
                                            component='span'
                                            sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)', ml: 0.5 }}
                                        >
                                            USD/month
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                        <CreditIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                            {tier.creditsPerMonth.toLocaleString()} Credits included
                                        </Typography>
                                    </Box>
                                </Box>

                                <Stack spacing={2}>
                                    {tier.features.map((feature, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1.5
                                            }}
                                        >
                                            <CheckIcon sx={{ fontSize: 20, color: theme.palette.primary.main, mt: 0.25 }} />
                                            <Typography
                                                sx={{
                                                    color: '#fff',
                                                    fontSize: '0.875rem',
                                                    lineHeight: 1.5
                                                }}
                                            >
                                                {feature}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>

                                <Box sx={{ mt: 'auto', pt: 3 }}>
                                    <Button
                                        variant='contained'
                                        fullWidth
                                        onClick={() => handleSubscribe(tier)}
                                        disabled={loading}
                                        sx={{
                                            bgcolor: tier.highlighted ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.1)',
                                            color: '#fff',
                                            textTransform: 'none',
                                            py: 1.5,
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            '&:hover': {
                                                bgcolor: tier.highlighted ? theme.palette.primary.dark : 'rgba(255, 255, 255, 0.15)'
                                            }
                                        }}
                                    >
                                        {tier.price === 0 ? 'Current Plan' : 'Get Plus'}
                                    </Button>
                                </Box>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    )
}

export default PurchaseSubscription
