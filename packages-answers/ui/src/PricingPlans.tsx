'use client'

import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useUserPlans } from './hooks/useUserPlan'
import { PlanWithPriceObject, usePlans } from './hooks/usePlans'

export const PricingPlans: React.FC = () => {
    const { isActivePlan, mutateActiveUserPlan, activeUserPlan } = useUserPlans()
    const { plans } = usePlans()
    const [loading, setLoading] = useState(false)

    const goToPlanCheckout = useCallback(async (plan: PlanWithPriceObject) => {
        const res = await fetch(`/api/payments/checkout`, {
            method: 'POST',
            body: JSON.stringify({ priceId: plan.priceObj?.id, origin: window.location.origin }),
            headers: {
                'Content-Type': 'application/json'
            }
        })

        window.location.assign((await res.json()).url)
    }, [])

    // check for session_id in url
    useEffect(() => {
        const awaitPlanCreation = async () => {
            try {
                const res = await fetch(`/api/payments/success`, {
                    method: 'POST',
                    body: JSON.stringify({ sessionId }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                const data = await res.json()
                if (data.success) {
                    await mutateActiveUserPlan()
                    setLoading(false)
                } else {
                    // TODO: error messaging
                    setLoading(false)
                }
            } catch (err) {
                // TODO: error messaging
                setLoading(false)
            }
        }
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get('session_id')
        if (sessionId) {
            setLoading(true)
            awaitPlanCreation()
        }
    }, [mutateActiveUserPlan])

    return (
        <>
            {loading ? (
                <CircularProgress />
            ) : (
                <Box sx={{ display: 'flex', gap: 1, padding: 1 }}>
                    {plans?.map((plan) => (
                        <Card
                            key={plan.id}
                            variant='outlined'
                            sx={{
                                borderColor: isActivePlan(plan) ? 'primary.main' : 'grey.300',
                                borderWidth: isActivePlan(plan) ? '2px' : '1px',
                                position: 'relative'
                            }}
                        >
                            {isActivePlan(plan) && (
                                <Typography
                                    variant='body2'
                                    color='primary.main'
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '0.5rem',
                                        background: 'transparent',
                                        paddingLeft: '0.5rem',
                                        paddingRight: '0.5rem'
                                    }}
                                >
                                    Current Plan
                                </Typography>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <CardHeader
                                    title={
                                        <Typography variant='h4' align='center'>
                                            {plan.name}
                                        </Typography>
                                    }
                                />
                                <CardContent>
                                    {plan.priceObj?.unit_amount && (
                                        <Typography variant='h6'>${plan.priceObj.unit_amount / 100}/month</Typography>
                                    )}
                                    <Typography variant='body1'>{plan.description}</Typography>
                                </CardContent>
                                {plan.id > activeUserPlan?.planId! && (
                                    <Box
                                        sx={{
                                            marginTop: 'auto',
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            padding: 2
                                        }}
                                    >
                                        <Button variant='contained' color='primary' onClick={() => goToPlanCheckout(plan)}>
                                            Upgrade
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Card>
                    ))}
                </Box>
            )}
        </>
    )
}
