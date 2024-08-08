'use client'
import { useCallback, useMemo, useState } from 'react'
import NextLink from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { useUserPlans } from '../hooks/useUserPlan'
import { usePlans } from '../hooks/usePlans'

export const PlanCard: React.FC = () => {
    const { handleCancelPlan, activeUserPlan } = useUserPlans()
    const { plans } = usePlans()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const monthlyCost = useMemo(() => {
        const amountInCents = (plans || []).find((plan) => plan.id === activeUserPlan?.planId)?.priceObj?.unit_amount
        return amountInCents ? amountInCents / 100 : 0
    }, [activeUserPlan?.planId, plans])

    const handleConfirmation = useCallback(() => {
        setDialogOpen(false)
        setLoading(true)
        handleCancelPlan(() => setLoading(false))
    }, [handleCancelPlan])

    return (
        <>
            <Card
                variant='outlined'
                sx={{
                    padding: '1rem',
                    ...(loading && {
                        display: 'flex',
                        justifyContent: 'center'
                    })
                }}
            >
                {loading ? (
                    <CircularProgress color='primary' />
                ) : (
                    <>
                        <Box display='flex' justifyContent='space-between' alignItems='center' padding='16px'>
                            <Typography variant='h6'>Plan info</Typography>
                            <Box display='flex' gap={1}>
                                {activeUserPlan?.planId !== 3 && (
                                    <Button component={NextLink} href='/plans' variant='contained' color='primary'>
                                        Upgrade
                                    </Button>
                                )}
                                {activeUserPlan?.planId != 1 && activeUserPlan?.shouldRenew && (
                                    <Button onClick={() => setDialogOpen(true)} variant='contained' color='secondary'>
                                        Cancel
                                    </Button>
                                )}
                            </Box>
                        </Box>
                        <CardContent>
                            <Divider />

                            <Typography variant='body1' style={{ marginTop: '16px' }}>
                                <strong>Current Plan:</strong> {activeUserPlan?.plan.name}
                            </Typography>

                            <Typography variant='body1'>
                                <strong>Monthly Cost:</strong> ${monthlyCost}
                            </Typography>

                            <Typography variant='body1'>
                                <strong>GPT-3 Requests (This Month):</strong> {activeUserPlan?.gpt3RequestCount}
                            </Typography>

                            <Typography variant='body1'>
                                <strong>GPT-4 Requests (This Month):</strong> {activeUserPlan?.gpt4RequestCount}
                            </Typography>

                            <Typography variant='body1'>
                                <strong>Tokens Remaining:</strong> {activeUserPlan?.tokensLeft?.toLocaleString()}
                            </Typography>

                            <Typography variant='body1'>
                                <strong>{activeUserPlan?.shouldRenew ? 'Renewal Date:' : 'Active until:'}</strong>{' '}
                                {activeUserPlan?.renewalDate?.toLocaleDateString()}
                            </Typography>
                        </CardContent>
                    </>
                )}
            </Card>
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Cancel Subscription</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to cancel your subscription? This cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => handleConfirmation()} color='primary'>
                        Proceed
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
