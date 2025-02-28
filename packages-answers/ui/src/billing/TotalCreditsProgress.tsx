'use client'

import React from 'react'
import { Box, Typography, LinearProgress, Alert, Tooltip, IconButton, Stack, Skeleton, Divider } from '@mui/material'
import { Info as InfoIcon, Receipt as ReceiptIcon } from '@mui/icons-material'
import { UsageSummary } from './hooks/useBillingData'

interface TotalCreditsProgressProps {
    usageSummary: UsageSummary | undefined
    isLoading?: boolean
    isError?: boolean
}

const TotalCreditsProgress: React.FC<TotalCreditsProgressProps> = ({ usageSummary, isLoading = false, isError = false }) => {
    if (isError) {
        return (
            <Box
                sx={{
                    p: 3,
                    mb: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(20px)'
                }}
            >
                <Alert
                    severity='error'
                    sx={{
                        bgcolor: 'rgba(211, 47, 47, 0.1)',
                        color: '#ff5252',
                        '& .MuiAlert-icon': {
                            color: '#ff5252'
                        }
                    }}
                >
                    Failed to load billing data. Please try again later.
                </Alert>
            </Box>
        )
    }

    // Default values for layout consistency during loading
    const totalUsed =
        (usageSummary?.usageDashboard?.aiTokens?.used || 0) +
        (usageSummary?.usageDashboard?.compute?.used || 0) +
        (usageSummary?.usageDashboard?.storage?.used || 0)
    const totalLimit = usageSummary?.currentPlan?.sparksIncluded || 10000
    const percentageUsed = Math.min((totalUsed / totalLimit) * 100, 100)
    const isOverLimit = usageSummary?.isOverLimit || false

    // Format numbers for display
    const formattedUsed = totalUsed.toLocaleString()
    const formattedLimit = totalLimit.toLocaleString()

    // Determine progress bar color based on usage
    let progressColor = 'primary.main'
    if (isOverLimit) {
        progressColor = 'error.main'
    } else if (percentageUsed > 75) {
        progressColor = 'warning.main'
    }

    // Calculate resource distribution percentages
    const aiTokensPercentage = usageSummary && totalUsed > 0 ? ((usageSummary.usageDashboard?.aiTokens?.used || 0) / totalUsed) * 100 : 0
    const computePercentage = usageSummary && totalUsed > 0 ? ((usageSummary.usageDashboard?.compute?.used || 0) / totalUsed) * 100 : 0
    const storagePercentage = usageSummary && totalUsed > 0 ? ((usageSummary.usageDashboard?.storage?.used || 0) / totalUsed) * 100 : 0

    // Format upcoming invoice data if available
    const hasUpcomingInvoice = usageSummary?.upcomingInvoice && !isLoading
    const upcomingInvoiceAmount = hasUpcomingInvoice
        ? (usageSummary?.upcomingInvoice?.amount || 0) / 100 // Convert from cents to dollars
        : 0
    const upcomingInvoiceCurrency = hasUpcomingInvoice ? usageSummary?.upcomingInvoice?.currency?.toUpperCase() || 'USD' : 'USD'
    const upcomingInvoiceDueDate =
        hasUpcomingInvoice && usageSummary?.upcomingInvoice?.dueDate
            ? new Date(usageSummary.upcomingInvoice.dueDate).toLocaleDateString()
            : 'N/A'

    return (
        <Box
            sx={{
                p: 3,
                mb: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
                <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='h5' sx={{ color: '#fff', fontWeight: 600 }}>
                        Total Credits Usage
                    </Typography>
                    <Tooltip
                        title='This shows your total credits usage across all resource types. Your plan has a single credit limit that all resources count towards.'
                        arrow
                        placement='top'
                    >
                        <IconButton size='small' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            <InfoIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                </Stack>
                {isLoading ? (
                    <Skeleton variant='text' width={120} height={24} />
                ) : (
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
                        {formattedUsed} / {formattedLimit} Sparks
                    </Typography>
                )}
            </Stack>

            {isLoading ? (
                <Skeleton variant='rectangular' height={16} sx={{ borderRadius: 8, mb: 2 }} />
            ) : (
                <LinearProgress
                    variant='determinate'
                    value={percentageUsed}
                    sx={{
                        height: 16,
                        borderRadius: 8,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: progressColor
                        },
                        mb: 2
                    }}
                />
            )}

            <Stack direction='row' justifyContent='space-between'>
                {isLoading ? (
                    <>
                        <Skeleton variant='text' width={80} />
                        <Skeleton variant='text' width={80} />
                    </>
                ) : (
                    <>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                            {percentageUsed.toFixed(1)}% Used
                        </Typography>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                            {(100 - percentageUsed).toFixed(1)}% Remaining
                        </Typography>
                    </>
                )}
            </Stack>

            {/* Resource distribution section */}
            {!isLoading && totalUsed > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', mb: 1 }}>Resource Distribution</Typography>
                    <Box sx={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', mb: 1 }}>
                        <Box sx={{ width: `${aiTokensPercentage}%`, bgcolor: '#3f51b5' }} />
                        <Box sx={{ width: `${computePercentage}%`, bgcolor: '#4caf50' }} />
                        <Box sx={{ width: `${storagePercentage}%`, bgcolor: '#ff9800' }} />
                    </Box>
                    <Stack direction='row' spacing={2} sx={{ mt: 1 }}>
                        <Stack direction='row' spacing={0.5} alignItems='center'>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3f51b5' }} />
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                AI Tokens ({aiTokensPercentage.toFixed(1)}%)
                            </Typography>
                        </Stack>
                        <Stack direction='row' spacing={0.5} alignItems='center'>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50' }} />
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                Compute ({computePercentage.toFixed(1)}%)
                            </Typography>
                        </Stack>
                        <Stack direction='row' spacing={0.5} alignItems='center'>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff9800' }} />
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                Storage ({storagePercentage.toFixed(1)}%)
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>
            )}

            {/* Upcoming Invoice Section */}
            {hasUpcomingInvoice && (
                <>
                    <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                    <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
                        <ReceiptIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                        <Typography sx={{ color: '#fff', fontWeight: 600 }}>Upcoming Invoice</Typography>
                        <Tooltip
                            title='This is a preview of your next invoice based on your current usage and subscription.'
                            arrow
                            placement='top'
                        >
                            <IconButton size='small' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                <InfoIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: '8px' }}>
                        <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>Amount Due:</Typography>
                            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                {upcomingInvoiceAmount.toFixed(2)} {upcomingInvoiceCurrency}
                            </Typography>
                        </Stack>

                        <Stack direction='row' justifyContent='space-between'>
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>Due Date:</Typography>
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                {upcomingInvoiceDueDate}
                            </Typography>
                        </Stack>

                        {usageSummary?.upcomingInvoice?.totalCreditsUsed && (
                            <Stack direction='row' justifyContent='space-between' sx={{ mt: 1 }}>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>Credits Used:</Typography>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                    {usageSummary.upcomingInvoice.totalCreditsUsed.toLocaleString()} Sparks
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                </>
            )}

            {!isLoading && isOverLimit && (
                <Alert
                    severity='error'
                    sx={{
                        mt: 2,
                        bgcolor: 'rgba(211, 47, 47, 0.1)',
                        color: '#ff5252',
                        '& .MuiAlert-icon': {
                            color: '#ff5252'
                        }
                    }}
                >
                    You have exceeded your credit limit. Please upgrade your plan or purchase additional credits.
                </Alert>
            )}

            {!isLoading && percentageUsed > 90 && !isOverLimit && (
                <Alert
                    severity='warning'
                    sx={{
                        mt: 2,
                        bgcolor: 'rgba(237, 108, 2, 0.1)',
                        color: '#ffab40',
                        '& .MuiAlert-icon': {
                            color: '#ffab40'
                        }
                    }}
                >
                    You are approaching your credit limit. Consider upgrading your plan soon.
                </Alert>
            )}

            {/* Placeholder for alerts to maintain consistent height */}
            {isLoading && <Box sx={{ mt: 2, height: '56px' }} />}
        </Box>
    )
}

export default TotalCreditsProgress
