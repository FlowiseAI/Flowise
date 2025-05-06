'use client'

import React, { useState, useCallback } from 'react'
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Grid,
    Typography,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    useTheme,
    CircularProgress
} from '@mui/material'
import {
    Bolt as ZapIcon,
    Timer as TimerIcon,
    Calculate as CalculatorIcon,
    TrendingUp as ActivityIcon,
    Group as UsersIcon,
    Memory as CpuIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { STRIPE_PRICE_IDS } from '@ui/config/billing'
import UsageStats from '../billing/UsageStats'

interface UsageMetrics {
    ai_tokens: number
    compute: number
    storage: number
    total: number
    cost: number
}

interface CreditPackage {
    id: string
    name: string
    description: string
    credits: number
    price: number
    priceId: string
    pricePerCredit: number
    highlighted?: boolean
}

const creditPackages: CreditPackage[] = [
    {
        id: 'starter',
        name: 'Starter Pack',
        description: 'Perfect for trying out the platform',
        credits: 10000,
        price: 10,
        priceId: STRIPE_PRICE_IDS.FREE,
        pricePerCredit: 0.001
    },
    {
        id: 'pro',
        name: 'Pro Pack',
        description: 'Most popular for active users',
        credits: 100000,
        price: 89,
        priceId: STRIPE_PRICE_IDS.STANDARD,
        pricePerCredit: 0.00089,
        highlighted: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise Pack',
        description: 'Best value for power users',
        credits: 1000000,
        price: 799,
        priceId: STRIPE_PRICE_IDS.ENTERPRISE,
        pricePerCredit: 0.000799
    }
]

const stats = [
    { icon: ZapIcon, value: '1M+', label: 'Credits Used' },
    { icon: UsersIcon, value: '50k+', label: 'Active Users' },
    { icon: ActivityIcon, value: '99.9%', label: 'Uptime' },
    { icon: CpuIcon, value: '0.1s', label: 'Avg Response' }
]

const PricingWizard: React.FC = () => {
    const theme = useTheme()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [timeLeft, setTimeLeft] = useState('23:59:59')
    const [usage, setUsage] = useState({
        requests: 100,
        complexity: 'simple'
    })

    const calculateCredits = () => {
        const baseRate = usage.complexity === 'simple' ? 1 : usage.complexity === 'medium' ? 2 : 3
        return usage.requests * baseRate
    }

    const handlePurchaseCredits = useCallback(async (pack: CreditPackage) => {
        setLoading(true)
        try {
            const response = await fetch('/api/billing/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    credits: pack.credits,
                    priceId: pack.priceId
                })
            })
            if (!response.ok) throw new Error('Failed to initiate purchase')
            const { url } = await response.json()
            if (url) window.location.assign(url)
        } catch (error) {
            console.error('Failed to initiate purchase:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: `linear-gradient(180deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`
            }}
        >
            <Container maxWidth='lg' sx={{ py: 8 }}>
                <Box textAlign='center' mb={6}>
                    <Typography
                        variant='overline'
                        component='div'
                        sx={{
                            display: 'inline-block',
                            bgcolor: theme.palette.primary.light,
                            color: theme.palette.primary.main,
                            borderRadius: '16px',
                            px: 2,
                            py: 0.5,
                            mb: 2
                        }}
                    >
                        Limited Time Offer - <TimerIcon sx={{ verticalAlign: 'middle', fontSize: '1rem' }} /> {timeLeft} left
                    </Typography>

                    <Typography
                        variant='h2'
                        component='h1'
                        sx={{
                            fontWeight: 'bold',
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                            backgroundClip: 'text',
                            textFillColor: 'transparent',
                            mb: 2
                        }}
                    >
                        Supercharge Your AI Workflow
                    </Typography>

                    <Typography variant='h5' color='text.secondary' sx={{ maxWidth: '600px', mx: 'auto', mb: 4 }}>
                        Start with 100 free credits today. Join 50,000+ developers building the future with our AI platform.
                    </Typography>
                </Box>

                <Grid container spacing={4} sx={{ mb: 8 }}>
                    {stats.map((stat, index) => (
                        <Grid item xs={6} md={3} key={index}>
                            <Card sx={{ textAlign: 'center', bgcolor: 'background.paper' }}>
                                <CardContent>
                                    <stat.icon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                    <Typography variant='h4' component='div' fontWeight='bold'>
                                        {stat.value}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        {stat.label}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <UsageStats />

                <Grid container spacing={4} sx={{ mb: 8 }}>
                    <Grid item xs={12} md={12}>
                        <Card>
                            <CardHeader
                                title={
                                    <Box display='flex' alignItems='center' gap={1}>
                                        <CalculatorIcon />
                                        <Typography variant='h5'>Credit Calculator</Typography>
                                    </Box>
                                }
                            />
                            <CardContent>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label='Monthly API Requests'
                                            type='number'
                                            InputProps={{ inputProps: { min: 1 } }}
                                            value={usage.requests}
                                            onChange={(e) => setUsage({ ...usage, requests: parseInt(e.target.value) || 0 })}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Complexity Level</InputLabel>
                                            <Select
                                                value={usage.complexity}
                                                label='Complexity Level'
                                                onChange={(e) => setUsage({ ...usage, complexity: e.target.value })}
                                            >
                                                <MenuItem value='simple'>Simple</MenuItem>
                                                <MenuItem value='medium'>Medium</MenuItem>
                                                <MenuItem value='complex'>Complex</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                                <Box pt={3} borderTop={1} borderColor='divider' mt={3}>
                                    <Typography variant='h6' fontWeight='bold'>
                                        Estimated monthly credits: {calculateCredits()}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Typography variant='h4' gutterBottom textAlign='center' sx={{ mb: 4 }}>
                    Purchase Credits
                </Typography>

                <Grid container spacing={3}>
                    {creditPackages.map((pack) => (
                        <Grid item xs={12} md={4} key={pack.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    ...(pack.highlighted && {
                                        borderColor: 'primary.main',
                                        borderWidth: 2,
                                        borderStyle: 'solid'
                                    })
                                }}
                            >
                                {pack.highlighted && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 0,
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            px: 2,
                                            py: 0.5,
                                            borderTopLeftRadius: 16,
                                            borderBottomLeftRadius: 16
                                        }}
                                    >
                                        Best Value
                                    </Box>
                                )}
                                <CardHeader
                                    title={pack.name}
                                    titleTypographyProps={{ align: 'center', variant: 'h5' }}
                                    sx={{ backgroundColor: theme.palette.grey[50] }}
                                />
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                                        <Typography component='h2' variant='h3' color='primary'>
                                            ${pack.price}
                                        </Typography>
                                        <Typography variant='subtitle1' color='text.secondary' sx={{ mb: 1 }}>
                                            {pack.credits.toLocaleString()} Credits
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary'>
                                            ${pack.pricePerCredit.toFixed(4)} per credit
                                        </Typography>
                                    </Box>
                                    <Typography variant='subtitle1' align='center' sx={{ mb: 2 }}>
                                        {pack.description}
                                    </Typography>
                                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                                        <Button
                                            variant={pack.highlighted ? 'contained' : 'outlined'}
                                            color='primary'
                                            size='large'
                                            onClick={() => handlePurchaseCredits(pack)}
                                            disabled={loading}
                                        >
                                            {loading ? <CircularProgress size={24} /> : 'Purchase Credits'}
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    )
}

export default PricingWizard
