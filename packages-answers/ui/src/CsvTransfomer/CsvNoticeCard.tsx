'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Card, Typography, Button, Stack, CircularProgress } from '@mui/material'

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LaunchIcon from '@mui/icons-material/Launch'
import RefreshIcon from '@mui/icons-material/Refresh'
import SnackMessage from '../SnackMessage'

interface CsvNoticeCardProps {
    onRefresh?: () => Promise<void>
}

const CsvNoticeCard: React.FC<CsvNoticeCardProps> = ({ onRefresh }) => {
    const [navigating, setNavigating] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const [noticeSnack, setNoticeSnack] = useState('')

    const handleRefresh = useCallback(async () => {
        if (!onRefresh) return

        try {
            setIsRefreshing(true)
            await onRefresh()
            setNoticeSnack('Templates refreshed. If a CSV processor was installed, it should now be visible.')
        } catch (error) {
            console.error('Error refreshing chatflows:', error)
            setNoticeSnack('Failed to refresh templates. Please try again.')
        } finally {
            setIsRefreshing(false)
        }
    }, [onRefresh])

    // Check if user returned from marketplace and auto-refresh
    useEffect(() => {
        const checkMarketplaceReturn = () => {
            const installedCsv = localStorage.getItem('answerai.csv.processor-installed')
            if (installedCsv && onRefresh) {
                localStorage.removeItem('answerai.csv.processor-installed')
                // Auto-refresh after a short delay
                setTimeout(() => {
                    handleRefresh()
                }, 1000)
            }
        }

        checkMarketplaceReturn()

        // Listen for focus events (when user returns to tab)
        window.addEventListener('focus', checkMarketplaceReturn)
        return () => window.removeEventListener('focus', checkMarketplaceReturn)
    }, [handleRefresh])

    const handleUseProcessor = () => {
        setNavigating(true)

        // Mark that user is going to install CSV processor
        localStorage.setItem('answerai.csv.install-intent', 'true')

        // Open marketplace in a new tab with CSV usecase filter
        window.open('/sidekick-studio/marketplaces?usecase=CSV', '_blank', 'noopener,noreferrer')

        // Reset loading state after a brief delay to show feedback
        setTimeout(() => {
            setNavigating(false)
        }, 1000)
    }

    return (
        <Card
            variant='outlined'
            sx={{
                p: { xs: 2, sm: 2.5, md: 3 },
                mt: { xs: 1.5, sm: 2 },
                borderRadius: { xs: 1, sm: 1.5 },
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: { xs: 1, sm: 2 },
                    borderColor: 'primary.main'
                }
            }}
        >
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems={{ xs: 'stretch', lg: 'center' }}>
                {/* Content Section */}
                <Stack direction='row' spacing={2} alignItems='center' flexGrow={1}>
                    <InfoOutlinedIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                    <Stack>
                        <Typography variant='h5' gutterBottom>
                            CSV Processor Setup Required
                        </Typography>
                        <Typography variant='body2' color='textSecondary' sx={{ mb: 1 }}>
                            To use the CSV Transformer, you need at least one chatflow tagged with 'csv'.
                        </Typography>
                        <Typography variant='body2' color='textSecondary' sx={{ mb: 1 }}>
                            Click below to install our ready-to-use CSV processor template from the marketplace.
                        </Typography>
                        <Typography variant='body2' color='textSecondary' sx={{ fontStyle: 'italic' }}>
                            After installation: return to this page and click Refresh to load the template.
                        </Typography>
                    </Stack>
                </Stack>

                {/* Actions Section */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    flexShrink={0}
                    sx={{ alignItems: 'stretch', justifyContent: 'flex-end' }}
                >
                    <Button
                        variant='outlined'
                        size='small'
                        startIcon={navigating ? <CircularProgress size={16} color='inherit' /> : <LaunchIcon sx={{ fontSize: 16 }} />}
                        onClick={handleUseProcessor}
                        disabled={navigating}
                        sx={{
                            fontWeight: 500,
                            textTransform: 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {navigating ? 'Opening Marketplace...' : 'Install CSV Processor'}
                    </Button>

                    <Button
                        variant='contained'
                        size='small'
                        startIcon={isRefreshing ? <CircularProgress size={16} color='inherit' /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        sx={{
                            fontWeight: 500,
                            textTransform: 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isRefreshing ? 'Refreshing…' : 'Refresh'}
                    </Button>
                </Stack>
            </Stack>
            <SnackMessage message={noticeSnack} />
        </Card>
    )
}

export default CsvNoticeCard
