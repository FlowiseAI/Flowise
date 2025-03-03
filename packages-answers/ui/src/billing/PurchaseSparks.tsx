'use client'

import React, { useState } from 'react'
import { Box, Card, Typography, Grid, Button, Stack } from '@mui/material'
import { Bolt as CreditIcon, AddBox as CubeIcon } from '@mui/icons-material'

interface CreditPackage {
    credits: number
    price: number
    discount?: number
}

const CREDIT_PACKAGES: CreditPackage[] = [
    { credits: 1000, price: 10 },
    { credits: 5000, price: 45, discount: 10 },
    { credits: 10000, price: 80, discount: 20 }
]

const PurchaseCredits = () => {
    const [loading, setLoading] = useState(false)
    const [customAmount, setCustomAmount] = useState('')

    const handlePurchase = async (credits: number, amount: number) => {
        setLoading(true)
        try {
            const response = await fetch('/api/billing/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ credits, amount })
            })
            if (!response.ok) throw new Error('Failed to initiate purchase')
            const { url } = await response.json()
            if (url) window.location.assign(url)
        } catch (error) {
            console.error('Failed to initiate purchase:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box sx={{ p: 3 }}>
            <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography
                    variant='h5'
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: '#fff'
                    }}
                >
                    <CreditIcon sx={{ fontSize: 20 }} /> Purchase Credits
                </Typography>
                <Typography
                    sx={{
                        color: '#999',
                        fontSize: '0.875rem'
                    }}
                >
                    Top up your account with more Credits
                </Typography>
            </Stack>

            <Grid container spacing={2.5}>
                {CREDIT_PACKAGES.map((pkg) => (
                    <Grid item xs={12} md={4} key={pkg.credits}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 3,
                                position: 'relative',
                                border: '1px solid #333',
                                borderRadius: '12px',
                                bgcolor: '#111',
                                '&:hover': {
                                    borderColor: '#444'
                                }
                            }}
                        >
                            {pkg.discount && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 16,
                                        bgcolor: '#fff',
                                        color: '#111',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: '100px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        lineHeight: 1
                                    }}
                                >
                                    {pkg.discount}% OFF
                                </Box>
                            )}
                            <Stack spacing={3}>
                                <CubeIcon sx={{ fontSize: 24, color: '#fff' }} />
                                <Stack spacing={0.5}>
                                    <Typography
                                        sx={{
                                            fontSize: '2rem',
                                            fontWeight: 600,
                                            color: '#fff',
                                            lineHeight: 1.2
                                        }}
                                    >
                                        {pkg.credits.toLocaleString()}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '1.125rem',
                                            color: '#fff',
                                            fontWeight: 500
                                        }}
                                    >
                                        Credits
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: '#999',
                                            fontSize: '0.875rem',
                                            mt: 0.5
                                        }}
                                    >
                                        ${pkg.price}
                                    </Typography>
                                </Stack>
                                <Button
                                    variant='contained'
                                    fullWidth
                                    onClick={() => handlePurchase(pkg.credits, pkg.price)}
                                    disabled={loading}
                                    sx={{
                                        bgcolor: '#fff',
                                        color: '#111',
                                        textTransform: 'none',
                                        py: 1.5,
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        '&:hover': {
                                            bgcolor: '#eee'
                                        }
                                    }}
                                >
                                    Buy Now
                                </Button>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 4 }}>
                <Typography
                    sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#fff',
                        mb: 1.5
                    }}
                >
                    Custom Amount
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        border: '1px solid #333',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        bgcolor: '#111',
                        '&:hover': {
                            borderColor: '#444'
                        },
                        '&:focus-within': {
                            borderColor: '#444'
                        }
                    }}
                >
                    <input
                        type='number'
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder='Enter Credit amount'
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            padding: '12px 16px',
                            fontSize: '0.875rem',
                            color: '#fff'
                        }}
                    />
                    <Button
                        variant='contained'
                        onClick={() => handlePurchase(Number(customAmount), Number(customAmount) * 0.001)}
                        disabled={loading || !customAmount}
                        sx={{
                            bgcolor: '#fff',
                            color: '#111',
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 3,
                            m: 0.5,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            '&:hover': {
                                bgcolor: '#eee'
                            }
                        }}
                    >
                        Purchase
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

export default PurchaseCredits
