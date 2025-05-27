import { NextFunction, Request, Response } from 'express'

import logger from '../../utils/logger'
import { UsageStats } from '../../aai-utils/billing/core/types'
import { BILLING_CONFIG } from '../../aai-utils/billing/config'
import { UsageSummary } from '../../aai-utils/billing/core/types'
import Stripe from 'stripe'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Chat } from '../../database/entities/Chat'
import { IsNull } from 'typeorm'
import { BillingService } from '../../aai-utils/billing'

/**
 * Get usage statistics for the current user
 */
const getUsageSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customerId = req.user?.stripeCustomerId
        // if (!customerId) {
        //     throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User has no associated Stripe customer')
        // }
        let subscription: Stripe.Subscription | null = null
        let usage: UsageStats | null = null
        try {
            const billingService = new BillingService()
            ;[subscription, usage] = await Promise.all([
                customerId ? billingService.getActiveSubscription(customerId) : Promise.resolve(null),
                customerId ? billingService.getUsageSummary(customerId) : Promise.resolve(null)
            ])
        } catch (error: any) {
            console.error('Error getting usage stats:', error.message)
            // next(error)
        }
        // Determine plan type
        const isPro =
            subscription?.status === 'active' &&
            subscription.items.data?.length &&
            subscription.items.data[0]?.price.id !== BILLING_CONFIG.PRICE_IDS.FREE_MONTHLY
        const planLimits = isPro ? BILLING_CONFIG.PLAN_LIMITS.PRO : BILLING_CONFIG.PLAN_LIMITS.FREE

        // Calculate total usage
        const totalUsage = (usage?.usageByMeter?.ai_tokens || 0) + (usage?.usageByMeter?.compute || 0) + (usage?.usageByMeter?.storage || 0)

        // Check if over limit
        const isOverLimit = totalUsage > planLimits

        const appServer = getRunningExpressApp()
        const totalChats = await appServer.AppDataSource.getRepository(Chat).count({
            where: { organizationId: res.locals.filter.organizationId, ownerId: res.locals.filter.userId }
        })
        const totalMessagesSent = await appServer.AppDataSource.getRepository(ChatMessage).count({
            where: [
                {
                    role: 'userMessage',
                    ...res.locals.filter,
                    organizationId: IsNull()
                },
                {
                    role: 'userMessage',
                    ...res.locals.filter,
                    organizationId: res.locals.filter.organizationId
                }
            ]
        })
        const totalMessagesGenerated = await appServer.AppDataSource.getRepository(ChatMessage).count({
            where: [
                {
                    role: 'apiMessage',
                    ...res.locals.filter,
                    organizationId: IsNull()
                },
                {
                    role: 'apiMessage',
                    ...res.locals.filter,
                    organizationId: res.locals.filter.organizationId
                }
            ]
        })

        // Get organization-wide statistics only if the user is an admin
        let organizationTotalChats = 0
        let organizationTotalMessagesSent = 0
        let organizationTotalMessagesGenerated = 0

        if (req.user?.roles?.includes('Admin')) {
            ;[organizationTotalChats, organizationTotalMessagesSent, organizationTotalMessagesGenerated] = await Promise.all([
                appServer.AppDataSource.getRepository(Chat).count({
                    where: { organizationId: res.locals.filter.organizationId }
                }),
                appServer.AppDataSource.getRepository(ChatMessage).count({
                    where: [
                        { role: 'userMessage', organizationId: res.locals.filter.organizationId },
                        { role: 'userMessage', organizationId: IsNull() }
                    ]
                }),
                appServer.AppDataSource.getRepository(ChatMessage).count({
                    where: [
                        { role: 'apiMessage', organizationId: res.locals.filter.organizationId },
                        { role: 'apiMessage', organizationId: IsNull() }
                    ]
                })
            ])
        }

        const usageSummary: UsageSummary = {
            currentPlan: {
                name: isPro ? 'Pro' : 'Free',
                status: subscription?.status === 'active' ? 'active' : 'inactive',
                creditsIncluded: planLimits
            },
            usageDashboard: {
                totalChats,
                totalMessagesSent,
                totalMessagesGenerated,
                totalMessages: totalMessagesSent + totalMessagesGenerated,
                organizationTotalChats,
                organizationTotalMessagesSent,
                organizationTotalMessagesGenerated,
                organizationTotalMessages: organizationTotalMessagesSent + organizationTotalMessagesGenerated,
                aiTokens: {
                    used: usage?.usageByMeter?.ai_tokens || 0,
                    total: planLimits * 0.5, // 50% allocation for AI tokens
                    rate: BILLING_CONFIG.CREDIT_TO_USD * 100, // Cost per 100 credits
                    cost: (usage?.usageByMeter?.ai_tokens || 0) * BILLING_CONFIG.CREDIT_TO_USD
                },
                compute: {
                    used: usage?.usageByMeter?.compute || 0,
                    total: planLimits * 0.3, // 30% allocation for compute
                    rate: BILLING_CONFIG.CREDIT_TO_USD * 50, // Cost per 50 credits
                    cost: (usage?.usageByMeter?.compute || 0) * BILLING_CONFIG.CREDIT_TO_USD
                },
                storage: {
                    used: usage?.usageByMeter?.storage || 0,
                    total: planLimits * 0.2, // 20% allocation for storage
                    rate: BILLING_CONFIG.CREDIT_TO_USD * 500, // Cost per 500 credits
                    cost: (usage?.usageByMeter?.storage || 0) * BILLING_CONFIG.CREDIT_TO_USD
                }
            },
            billingPeriod: {
                start: subscription ? new Date(subscription.current_period_start * 1000) : new Date(),
                end: subscription ? new Date(subscription.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                current: new Date()
            },
            pricing: {
                aiTokensRate: `1,000 tokens = 100 Credits ($${(BILLING_CONFIG.CREDIT_TO_USD * 100).toFixed(3)})`,
                computeRate: `1 minute = 50 credits ($${(BILLING_CONFIG.CREDIT_TO_USD * 50).toFixed(3)})`,
                storageRate: `1 GB/month = 500 credits ($${(BILLING_CONFIG.CREDIT_TO_USD * 500).toFixed(3)})`,
                creditRate: `1 Credit = $${BILLING_CONFIG.CREDIT_TO_USD.toFixed(6)} USD`
            },
            dailyUsage: (() => {
                // Process daily usage data from the dailyUsageByMeter
                const dailyUsageMap = new Map<string, { aiTokens: number; compute: number; storage: number; total: number }>()

                // Process AI tokens
                usage?.dailyUsageByMeter?.ai_tokens?.forEach((item) => {
                    const dateStr = item.date.toISOString().split('T')[0]
                    if (!dailyUsageMap.has(dateStr)) {
                        dailyUsageMap.set(dateStr, { aiTokens: 0, compute: 0, storage: 0, total: 0 })
                    }
                    const entry = dailyUsageMap.get(dateStr)!
                    entry.aiTokens += item.value
                    entry.total += item.value
                })

                // Process compute
                usage?.dailyUsageByMeter?.compute?.forEach((item) => {
                    const dateStr = item.date.toISOString().split('T')[0]
                    if (!dailyUsageMap.has(dateStr)) {
                        dailyUsageMap.set(dateStr, { aiTokens: 0, compute: 0, storage: 0, total: 0 })
                    }
                    const entry = dailyUsageMap.get(dateStr)!
                    entry.compute += item.value
                    entry.total += item.value
                })

                // Process storage
                usage?.dailyUsageByMeter?.storage?.forEach((item) => {
                    const dateStr = item.date.toISOString().split('T')[0]
                    if (!dailyUsageMap.has(dateStr)) {
                        dailyUsageMap.set(dateStr, { aiTokens: 0, compute: 0, storage: 0, total: 0 })
                    }
                    const entry = dailyUsageMap.get(dateStr)!
                    entry.storage += item.value
                    entry.total += item.value
                })

                return Array.from(dailyUsageMap.entries())
                    .map(([date, data]) => ({
                        date,
                        ...data
                    }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            })(),
            isOverLimit, // Add the isOverLimit flag
            upcomingInvoice: usage?.upcomingInvoice // Include the upcoming invoice data,
        }

        res.json(usageSummary)
    } catch (error) {
        console.error('Error getting usage stats:', error)
        next(error)
    }
}

/**
 * Handles the /usage/sync endpoint to synchronize usage data from Langfuse to Stripe.
 */
const usageSyncHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const traceId = req.body?.traceId || req.query?.traceId
        const billingService = new BillingService()
        const result = await billingService.syncLangfuseUsageToStripe(traceId)
        return res.json({
            status: 'success',
            ...result
        })
    } catch (error) {
        console.error('Error syncing usage:', error)
        next(error)
    }
}

const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const session = await billingService.createCheckoutSession({
            priceId: BILLING_CONFIG.PRICE_IDS.PAID_MONTHLY,
            customerId: req.user?.stripeCustomerId!,
            successUrl: `${req.headers.origin}/billing?status=success`,
            cancelUrl: `${req.headers.origin}/billing?status=cancel`
        })

        return res.json({ url: session.url })
    } catch (error) {
        logger.error('Error creating checkout session')
        logger.error(error)
        next(error)
    }
}

/**
 * Get detailed usage events from Langfuse
 */
const getUsageEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const customerId = req.user?.stripeCustomerId
        // if (!customerId) {
        //     throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User has no associated Stripe customer')
        // }

        // Parse pagination parameters
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const sortBy = (req.query.sortBy as string) || 'timestamp'
        const sortDirection = (req.query.sortOrder as string) || 'desc'
        // Ensure sortOrder is only 'asc' or 'desc'
        const sortOrder = sortDirection === 'asc' ? 'asc' : 'desc'

        // Get traces from Langfuse
        const events = await billingService.getUsageEvents({
            user: req.user!,
            userId: !req.user?.roles?.includes('Admin') ? (req.user?.id as string) : (req.query.userId as string),
            customerId,
            page,
            limit,
            sortBy,
            sortOrder,
            // Parse filter from query string
            filter: req.query.filter ? JSON.parse(decodeURIComponent(req.query.filter as string)) : undefined
        })

        return res.json(events)
    } catch (error) {
        console.error('Error getting usage events:', error)
        next(error)
    }
}

export default {
    getUsageSummary,
    usageSyncHandler,
    createCheckoutSession,
    getUsageEvents
}
