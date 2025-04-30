'use client'

import { Card, Container, Stack, Typography, Tooltip } from '@mui/material'
import { TrendingUp as TrendingUpIcon, Info as InfoIcon } from '@mui/icons-material'
import PricingOverview from './PricingOverview'
import PurchaseCredits from './PurchaseCredits'
import UsageStats from './UsageStats'

const PricingPage = () => {
    return (
        <>
            <PricingOverview />
            <PurchaseCredits />
            <UsageStats />
            <Container maxWidth='lg'>
                <Card
                    sx={{
                        bgcolor: 'rgba(30,30,30,0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: 'none',
                        p: 3,
                        mt: 4
                    }}
                >
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 3 }}>
                        <TrendingUpIcon sx={{ color: 'primary.main' }} />
                        <Typography variant='h5' sx={{ color: 'white' }}>
                            Usage Trend
                        </Typography>
                        <Tooltip title='View your usage patterns over time'>
                            <InfoIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                        </Tooltip>
                    </Stack>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Normal usage pattern detected
                    </Typography>
                    {/* Add your usage trend graph component here */}
                </Card>
            </Container>
        </>
    )
}

export default PricingPage
