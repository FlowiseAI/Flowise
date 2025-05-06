'use client'

import { Box, Card, Container, Grid, Typography, Stack, Tooltip } from '@mui/material'
import { Info as InfoIcon, Bolt as CreditIcon } from '@mui/icons-material'
import { BILLING_CONFIG } from '../config/billing'

const PricingOverview = () => {
    return (
        <Container maxWidth='lg' sx={{ py: 4, color: 'white' }}>
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant='h4' gutterBottom sx={{ color: 'white' }}>
                    Simple, Usage-Based Pricing
                </Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                    Pay only for what you use with our Credits-based billing
                </Typography>
                <Typography variant='body1' sx={{ color: 'white', mb: 4 }}>
                    1 Credit = ${BILLING_CONFIG.CREDIT_TO_USD} USD
                </Typography>

                <Grid container spacing={3} justifyContent='center'>
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                bgcolor: 'rgba(30,30,30,0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: 'none',
                                p: 2
                            }}
                        >
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <CreditIcon sx={{ color: 'primary.main' }} />
                                <Typography variant='h6' sx={{ color: 'white' }}>
                                    AI Tokens
                                </Typography>
                                <Tooltip title='Cost per AI token usage'>
                                    <InfoIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                                </Tooltip>
                            </Stack>
                            <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                                1,000 tokens = {BILLING_CONFIG.RATES.AI_TOKENS.CREDITS} Credits (${BILLING_CONFIG.RATES.AI_TOKENS.COST})
                            </Typography>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                bgcolor: 'rgba(30,30,30,0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: 'none',
                                p: 2
                            }}
                        >
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <CreditIcon sx={{ color: 'primary.main' }} />
                                <Typography variant='h6' sx={{ color: 'white' }}>
                                    Compute Time
                                </Typography>
                                <Tooltip title='Cost per minute of compute time'>
                                    <InfoIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                                </Tooltip>
                            </Stack>
                            <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                                1 minute = {BILLING_CONFIG.RATES.COMPUTE.CREDITS} Credits (${BILLING_CONFIG.RATES.COMPUTE.COST})
                            </Typography>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                bgcolor: 'rgba(30,30,30,0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: 'none',
                                p: 2
                            }}
                        >
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <CreditIcon sx={{ color: 'primary.main' }} />
                                <Typography variant='h6' sx={{ color: 'white' }}>
                                    Storage
                                </Typography>
                                <Tooltip title='Cost per GB of storage per month'>
                                    <InfoIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                                </Tooltip>
                            </Stack>
                            <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                                1 GB/month = {BILLING_CONFIG.RATES.STORAGE.CREDITS} Credits (${BILLING_CONFIG.RATES.STORAGE.COST})
                            </Typography>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    )
}

export default PricingOverview
