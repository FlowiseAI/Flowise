'use client'

import { Box, Typography } from '@mui/material'
import NextLink from 'next/link'
import { useFlags } from 'flagsmith/react'
import { useUserPlans } from './hooks/useUserPlan'

export const RemainingTokensCounter: React.FC = () => {
    const { activeUserPlan } = useUserPlans()
    const flags = useFlags(['unlimited_tier'])

    const remainingTokens = flags.unlimited_tier.enabled ? Infinity : activeUserPlan?.tokensLeft ?? 0
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography>
                {!activeUserPlan ? (
                    'Calculating remaining tokens...'
                ) : remainingTokens <= 0 ? (
                    <>
                        You are out of tokens on the {activeUserPlan?.plan.name} plan. Your plan will renew with{' '}
                        {activeUserPlan?.plan.tokenLimit?.toLocaleString()} tokens on {activeUserPlan?.renewalDate?.toLocaleDateString()}.
                        {activeUserPlan?.planId < 3 && (
                            <>
                                {' '}
                                Click <NextLink href='/plans'>here</NextLink> to upgrade.
                            </>
                        )}
                    </>
                ) : (
                    <>Tokens remaining: {flags.unlimited_tier.enabled ? 'unlimited' : remainingTokens}</>
                )}
            </Typography>
        </Box>
    )
}
