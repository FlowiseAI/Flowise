'use client'

import React, { useEffect, useState } from 'react'
import { Box, Typography, Grid, LinearProgress, Tooltip, IconButton, Stack, useTheme, Skeleton } from '@mui/material'
import { Info as InfoIcon, Bolt as CreditIcon, Memory as CpuIcon, Storage as StorageIcon } from '@mui/icons-material'
import billingApi from '@/api/billing'
import useSWR from 'swr'
import { UsageSummary, UsageMetric } from './hooks/useBillingData'
import TotalCreditsProgress from './TotalCreditsProgress'

const getUsagePercentage = (used: number, total: number) => {
    if (!total) return 0
    return Math.min((used / total) * 100, 100)
}

interface UsageDashboard {
    aiTokens: UsageMetric
    compute: UsageMetric
    storage: UsageMetric
}

interface CurrentPlan {
    name: 'Free' | 'Pro'
    status: 'active' | 'inactive'
    creditsIncluded: number
}

interface BillingPeriod {
    start: string
    end: string
    current: string
}

interface PricingInfo {
    aiTokensRate: string
    computeRate: string
    storageRate: string
    creditRate: string
}

interface DailyUsage {
    date: string
    aiTokens: number
    compute: number
    storage: number
    total: number
}

interface UsageStatsProps {
    usageSummary: UsageSummary | undefined
    isLoading?: boolean
    isError?: boolean
}

interface SubscriptionUsage {
    id: string
    object: string
    aggregated_value: number
    end_time: number
    start_time: number
    meter: string
    meter_name: string
}

interface Subscription {
    id: string
    status: string
    collection_method: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trial_end: number | null
    trial_start: number | null
    trial_settings: {
        end_behavior: {
            missing_payment_method: string
        }
    }
    default_payment_method: string | null
    items?: {
        data: Array<{
            plan: {
                nickname: string
                billing_scheme: string
                tiers_mode: string
                usage_type: string
                product: string
            }
            price: {
                recurring: {
                    interval: string
                    interval_count: number
                }
            }
        }>
    }
    usage: SubscriptionUsage[]
}

const LoadingCard = () => {
    return (
        <Box
            sx={{
                p: 3,
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <Stack spacing={3}>
                {/* Header */}
                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <Skeleton variant='circular' width={24} height={24} />
                        <Skeleton variant='text' width={120} />
                    </Stack>
                    <Skeleton variant='circular' width={16} height={16} />
                </Stack>

                {/* Rate Info Box */}
                <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px' }}>
                    <Skeleton variant='text' width='80%' />
                </Box>

                {/* Usage Progress */}
                <Box>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                        <Skeleton variant='text' width={60} />
                        <Skeleton variant='text' width={100} />
                    </Stack>
                    <Skeleton variant='rectangular' height={8} sx={{ borderRadius: 4 }} />
                </Box>

                {/* Stats */}
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Box>
                            <Skeleton variant='text' width={60} sx={{ mb: 0.5 }} />
                            <Skeleton variant='text' width={80} height={32} />
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Box>
                            <Skeleton variant='text' width={60} sx={{ mb: 0.5 }} />
                            <Skeleton variant='text' width={80} height={32} />
                        </Box>
                    </Grid>
                </Grid>
            </Stack>
        </Box>
    )
}

const LoadingDailyUsageChart = () => {
    return (
        <Box
            sx={{
                p: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)',
                mt: 3
            }}
        >
            <Skeleton variant='text' width={200} height={32} sx={{ mb: 2 }} />
            <Box sx={{ height: 300, width: '100%' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Date', 'AI Tokens', 'Compute', 'Storage', 'Total'].map((header) => (
                                    <th key={header} style={{ padding: '8px', textAlign: header === 'Date' ? 'left' : 'right' }}>
                                        <Skeleton variant='text' width={header === 'Date' ? 100 : 80} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, idx) => (
                                <tr key={idx}>
                                    {[...Array(5)].map((_, cellIdx) => (
                                        <td
                                            key={cellIdx}
                                            style={{
                                                padding: '8px',
                                                textAlign: cellIdx === 0 ? 'left' : 'right',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            <Skeleton variant='text' width={cellIdx === 0 ? 100 : 80} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Box>
        </Box>
    )
}

const LoadingBillingPeriod = () => {
    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Skeleton variant='text' width={200} sx={{ mb: 1 }} />
            <Skeleton variant='rectangular' height={8} sx={{ borderRadius: 4, mb: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton variant='text' width={100} />
                <Skeleton variant='text' width={100} />
            </Box>
        </Box>
    )
}

const BillingPeriodProgress: React.FC<{ start: string; end: string }> = ({ start, end }) => {
    const theme = useTheme()
    const startDate = new Date(start)
    const endDate = new Date(end)
    const now = new Date()

    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const daysElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const progress = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100)

    // Calculate days remaining
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    return (
        <Box
            sx={{
                mt: 3,
                p: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
                <Typography sx={{ color: '#fff', fontWeight: 500 }}>Billing Period</Typography>
                <Typography
                    sx={{
                        color: daysRemaining < 5 ? theme.palette.warning.main : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem',
                        fontWeight: daysRemaining < 5 ? 600 : 400
                    }}
                >
                    {daysRemaining} days remaining
                </Typography>
            </Stack>

            <LinearProgress
                variant='determinate'
                value={progress}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                        bgcolor: theme.palette.primary.main,
                        borderRadius: 4
                    },
                    mb: 1
                }}
            />

            <Stack direction='row' justifyContent='space-between' sx={{ mt: 1 }}>
                <Box>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>Start Date</Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                        {startDate.toLocaleDateString()}
                    </Typography>
                </Box>
                <Box>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', textAlign: 'right' }}>End Date</Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>{endDate.toLocaleDateString()}</Typography>
                </Box>
            </Stack>
        </Box>
    )
}

const SubscriptionStatusCard: React.FC<{ subscription: Subscription }> = ({ subscription }) => {
    const theme = useTheme()
    if (!subscription) return null

    const plan = subscription.items?.data[0]?.plan
    const price = subscription.items?.data[0]?.price

    // Calculate total credits used
    const totalCredits = subscription.usage
        .filter((item) => item.meter_name === 'credits')
        .reduce((sum, item) => sum + item.aggregated_value, 0)

    // Format dates
    const formatDate = (date: string | number) =>
        new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

    return (
        <Box
            sx={{
                p: 3,
                width: '100%',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)',
                mb: 3
            }}
        >
            {/* Header Section */}
            <Stack spacing={2}>
                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                    <Stack spacing={1}>
                        <Typography variant='h5' sx={{ color: '#fff', fontWeight: 600 }}>
                            Subscription Overview
                        </Typography>
                        <Box
                            sx={{
                                px: 2,
                                py: 0.5,
                                bgcolor: subscription.status === 'active' ? 'success.main' : 'warning.main',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: 'fit-content'
                            }}
                        >
                            <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>
                                {subscription.status.toUpperCase()}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack alignItems='flex-end'>
                        <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
                            ${((totalCredits || 0) * 0.001).toFixed(2)} USD
                        </Typography>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Current Period Usage</Typography>
                    </Stack>
                </Stack>

                {/* Usage Progress */}
                <Box sx={{ mt: 3 }}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Total Credits Used</Typography>
                        <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>{totalCredits.toLocaleString()} / 500,000</Typography>
                    </Stack>
                    <LinearProgress
                        variant='determinate'
                        value={Math.min((totalCredits / 250_000) * 100, 100)}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: 'primary.main',
                                borderRadius: 4
                            }
                        }}
                    />
                </Box>

                {/* Subscription Details Grid */}
                <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px' }}>
                            <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, mb: 2 }}>Billing Details</Typography>
                            <Stack spacing={2}>
                                <Stack direction='row' justifyContent='space-between'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Billing Period</Typography>
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                                    </Typography>
                                </Stack>
                                <Stack direction='row' justifyContent='space-between'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Payment Method</Typography>
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {subscription.default_payment_method
                                            ? 'Card ending in ' + subscription.default_payment_method.slice(-4)
                                            : 'Not set'}
                                    </Typography>
                                </Stack>
                                <Stack direction='row' justifyContent='space-between'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                        Collection Method
                                    </Typography>
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {subscription.collection_method === 'charge_automatically' ? 'Automatic' : 'Manual'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px' }}>
                            <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, mb: 2 }}>Plan Details</Typography>
                            <Stack spacing={2}>
                                <Stack direction='row' justifyContent='space-between'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Billing Scheme</Typography>
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {plan?.billing_scheme === 'tiered' ? 'Tiered Pricing' : 'Fixed Pricing'}
                                    </Typography>
                                </Stack>
                                <Stack direction='row' justifyContent='space-between'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Usage Type</Typography>
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {plan?.usage_type === 'metered' ? 'Pay as you go' : 'Fixed quota'}
                                    </Typography>
                                </Stack>
                                <Stack direction='row' justifyContent='space-between'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                        Billing Interval
                                    </Typography>
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {price?.recurring?.interval_count === 1
                                            ? 'Monthly'
                                            : `Every ${price?.recurring?.interval_count} ${price?.recurring?.interval}s`}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>

                {/* Usage Breakdown */}
                <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, mb: 2 }}>Usage Breakdown</Typography>
                    <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px' }}>
                        {subscription.usage.map((usage, index) => (
                            <Stack
                                key={usage.id}
                                direction='row'
                                justifyContent='space-between'
                                sx={{
                                    py: 1,
                                    borderBottom: index !== subscription.usage.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                                }}
                            >
                                <Stack direction='row' spacing={2} alignItems='center'>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                        {usage.meter_name === 'Unknown' ? `Meter ${usage.meter.split('_').pop()}` : usage.meter_name}
                                    </Typography>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        {new Date(usage.start_time * 1000).toLocaleDateString()}
                                    </Typography>
                                </Stack>
                                <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                    {usage.aggregated_value.toLocaleString()} credits
                                </Typography>
                            </Stack>
                        ))}
                    </Box>
                </Box>

                {subscription.cancelAtPeriodEnd && (
                    <Typography sx={{ color: theme.palette.warning.main, fontSize: '0.875rem', mt: 2 }}>
                        This subscription will be canceled at the end of the current billing period
                    </Typography>
                )}
            </Stack>
        </Box>
    )
}

const UsageMetricCard: React.FC<{
    title: string
    icon: React.ReactNode
    metrics: UsageMetric
    tooltipText: string
    rateInfo: string
}> = ({ title, icon, metrics, tooltipText, rateInfo }) => {
    // Calculate the percentage of total usage this resource represents
    const totalUsed = metrics.used
    const totalCredits = metrics.total * 2 // Total credits for all resources
    const percentOfTotal = totalUsed > 0 && totalCredits > 0 ? (totalUsed / totalCredits) * 100 : 0

    return (
        <Box
            sx={{
                p: 3,
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <Stack spacing={2}>
                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                    <Stack direction='row' alignItems='center' spacing={1}>
                        {icon}
                        <Typography sx={{ color: '#fff', fontWeight: 500 }}>{title}</Typography>
                    </Stack>
                    <Tooltip title={tooltipText} arrow placement='top'>
                        <IconButton size='small' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            <InfoIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px' }}>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>{rateInfo}</Typography>
                </Box>

                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                        {metrics.used.toLocaleString()} Credits
                    </Typography>
                    <Typography
                        sx={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.875rem',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                        }}
                    >
                        {percentOfTotal.toFixed(1)}% of total
                    </Typography>
                </Stack>

                <Box>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', mb: 0.5 }}>Cost</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>${metrics.cost.toFixed(2)}</Typography>
                </Box>
            </Stack>
        </Box>
    )
}

const DailyUsageTable: React.FC<{ data: UsageSummary['dailyUsage'] }> = ({ data }) => {
    // Sort data by date in descending order (most recent first)
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Take only the last 7 days of data
    const recentData = sortedData.slice(0, 7)

    return (
        <Box
            sx={{
                p: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)',
                mt: 3
            }}
        >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
                <Typography sx={{ color: '#fff', fontWeight: 500 }}>Recent Daily Usage</Typography>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>Last 7 days</Typography>
            </Stack>

            <Box sx={{ maxHeight: 300, width: '100%', overflowY: 'auto' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Date', 'AI Tokens', 'Compute', 'Storage', 'Total'].map((header) => (
                                    <th
                                        key={header}
                                        style={{
                                            padding: '8px',
                                            textAlign: header === 'Date' ? 'left' : 'right',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontWeight: 500,
                                            fontSize: '0.875rem',
                                            position: 'sticky',
                                            top: 0,
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            zIndex: 1
                                        }}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentData.length > 0 ? (
                                recentData.map((row) => (
                                    <tr key={row.date}>
                                        <td
                                            style={{
                                                padding: '8px',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            {new Date(row.date).toLocaleDateString()}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px',
                                                textAlign: 'right',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            {row.aiTokens.toLocaleString()}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px',
                                                textAlign: 'right',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            {row.compute.toLocaleString()}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px',
                                                textAlign: 'right',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            {row.storage.toLocaleString()}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px',
                                                textAlign: 'right',
                                                color: '#fff',
                                                fontWeight: 500,
                                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            {row.total.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={5}
                                        style={{
                                            padding: '16px',
                                            textAlign: 'center',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    >
                                        No usage data available for the last 7 days
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Box>
            </Box>
        </Box>
    )
}

const UsageStats: React.FC<UsageStatsProps> = ({ usageSummary, isLoading = false, isError = false }) => {
    if (isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant='h5' sx={{ color: '#fff', fontWeight: 600, mb: 3 }}>
                    Resource Usage Details
                </Typography>
                <Box sx={{ p: 3, color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.1)', borderRadius: '8px' }}>
                    <Typography>Failed to load usage statistics. Please try again later.</Typography>
                </Box>
            </Box>
        )
    }

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant='h5' sx={{ color: '#fff', fontWeight: 600, mb: 3 }}>
                    Resource Usage Details
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <LoadingCard />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <LoadingCard />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <LoadingCard />
                    </Grid>
                </Grid>
                <LoadingBillingPeriod />
                <LoadingDailyUsageChart />
            </Box>
        )
    }

    if (!usageSummary) return null

    const { usageDashboard, billingPeriod, pricing } = usageSummary

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
                <Typography variant='h5' sx={{ color: '#fff', fontWeight: 600 }}>
                    Resource Usage Details
                </Typography>
                <Tooltip
                    title='This section shows detailed usage information for each resource type. The total credits usage is shown in the progress bar above.'
                    arrow
                    placement='top'
                >
                    <IconButton size='small' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <InfoIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <UsageMetricCard
                        title='AI Tokens'
                        icon={<CreditIcon sx={{ color: '#3f51b5' }} />}
                        metrics={usageDashboard.aiTokens}
                        tooltipText='AI token usage for language model interactions'
                        rateInfo={pricing.aiTokensRate}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <UsageMetricCard
                        title='Compute Time'
                        icon={<CpuIcon sx={{ color: '#4caf50' }} />}
                        metrics={usageDashboard.compute}
                        tooltipText='Compute time used for processing'
                        rateInfo={pricing.computeRate}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <UsageMetricCard
                        title='Storage'
                        icon={<StorageIcon sx={{ color: '#ff9800' }} />}
                        metrics={usageDashboard.storage}
                        tooltipText='Storage usage for files and data'
                        rateInfo={pricing.storageRate}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 0 }}>
                <Grid item xs={12} md={6}>
                    <BillingPeriodProgress start={billingPeriod.start} end={billingPeriod.end} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Box
                        sx={{
                            mt: 3,
                            p: 3,
                            height: '100%',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            bgcolor: 'rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}
                    >
                        <Typography sx={{ color: '#fff', fontWeight: 500, mb: 2 }}>Credit Rate</Typography>
                        <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px', mb: 2 }}>
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>{pricing.creditRate}</Typography>
                        </Box>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                            All resource usage is converted to Credits at the rates shown in each resource card.
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            <DailyUsageTable data={usageSummary.dailyUsage} />
        </Box>
    )
}

export default UsageStats
