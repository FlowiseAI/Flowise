import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import apiKeyService from '../../services/apikey'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { RateLimiterManager } from '../../utils/rateLimit'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { ChatflowType } from '../../Interface'
import chatflowsService from '../../services/chatflows'
import checkOwnership from '../../utils/checkOwnership'
// import billingService from '../../services/billing'
import logger from '../../utils/logger'
// import { billingService } from '../../services/billing'
import { CustomerStatus, UsageStats } from '../../aai-utils/billing/core/types'
import { BILLING_CONFIG } from '../../aai-utils/billing/config'
import { UsageSummary } from '../../aai-utils/billing/core/types'
import Stripe from 'stripe'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Chat } from '../../database/entities/Chat'
import { In, IsNull } from 'typeorm'
import { BillingService } from '../../aai-utils/billing'

const checkIfChatflowIsValidForStreaming = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.checkIfChatflowIsValidForStreaming - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.checkIfChatflowIsValidForStreaming(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const checkIfChatflowIsValidForUploads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.checkIfChatflowIsValidForUploads - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.checkIfChatflowIsValidForUploads(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.deleteChatflow - id not provided!`)
        }
        const apiResponse = await chatflowsService.deleteChatflow(req.params.id, req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id
        if (!userId) {
            return res.status(401).send('Unauthorized')
        }
        const filter = req.query.filter ? JSON.parse(decodeURIComponent(req.query.filter as string)) : undefined
        const apiResponse = await chatflowsService.getAllChatflows(
            req.query?.type as ChatflowType,
            { ...res.locals.filter, ...filter },
            req.user
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow via api key
const getChatflowByApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.apikey) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.getChatflowByApiKey - apikey not provided!`
            )
        }
        const apikey = await apiKeyService.getApiKey(req.params.apikey)
        if (!apikey) {
            return res.status(401).send('Unauthorized')
        }
        const apiResponse = await chatflowsService.getChatflowByApiKey(apikey.id, req.query.keyonly)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getChatflowById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.getChatflowById - id not provided!`)
        }
        const apiResponse = await chatflowsService.getChatflowById(req.params.id, req.user)

        // Check if the chatflow is public (Marketplace) for unauthenticated users
        if (!req.user && (!apiResponse.visibility || !apiResponse.visibility.includes('Marketplace') || !apiResponse.isPublic)) {
            throw new InternalFlowiseError(
                StatusCodes.UNAUTHORIZED,
                `Error: chatflowsRouter.getChatflowById - Unauthorized access to non-public chatflow!`
            )
        }

        // For authenticated users, check ownership
        if (req.user && !(await checkOwnership(apiResponse, req.user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const saveChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Error: chatflowsRouter.saveChatflow - Unauthorized!`)
        }
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.saveChatflow - body not provided!`)
        }
        const body = req.body
        const newChatFlow = new ChatFlow()

        Object.assign(newChatFlow, { ...body, userId: req.user?.id, organizationId: req.user?.organizationId })
        const apiResponse = await chatflowsService.saveChatflow(newChatFlow)

        // TODO: Abstract sending to AnswerAI through events endpoint and move to service
        const ANSWERAI_DOMAIN = req.auth?.payload.answersDomain ?? process.env.ANSWERAI_DOMAIN ?? 'https://beta.theanswer.ai'
        try {
            await fetch(ANSWERAI_DOMAIN + '/api/sidekicks/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + req.auth?.token!,
                    cookie: req.headers.cookie!
                },
                body: JSON.stringify({
                    chatflow: apiResponse,
                    chatflowDomain: req.auth?.payload?.chatflowDomain
                })
            })
        } catch (err) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.saveChatflow - AnswerAI sync failed!`)
        }

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const importChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflows: Partial<ChatFlow>[] = req.body.Chatflows
        const apiResponse = await chatflowsService.importChatflows(chatflows)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.updateChatflow - id not provided!`)
        }
        const chatflow = await chatflowsService.getChatflowById(req.params.id, req.user!)
        if (!chatflow) {
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        }

        if (!(await checkOwnership(chatflow, req.user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }
        const body = req.body
        const updateChatFlow = new ChatFlow()
        Object.assign(updateChatFlow, body)

        // Ensure chatbotConfig is passed as a string
        if (body.chatbotConfig && typeof body.chatbotConfig === 'string') {
            updateChatFlow.chatbotConfig = body.chatbotConfig
        }

        updateChatFlow.id = chatflow.id
        const rateLimiterManager = RateLimiterManager.getInstance()
        await rateLimiterManager.updateRateLimiter(updateChatFlow)

        const apiResponse = await chatflowsService.updateChatflow(chatflow, updateChatFlow)

        // TODO: Abstract sending to AnswerAI through events endpoint and move to service
        const ANSWERAI_DOMAIN = req.auth?.payload.answersDomain ?? process.env.ANSWERAI_DOMAIN ?? 'https://beta.theanswer.ai'
        try {
            await fetch(ANSWERAI_DOMAIN + '/api/sidekicks/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + req.auth?.token!,
                    cookie: req.headers.cookie!
                },
                body: JSON.stringify({
                    chatflow: apiResponse,
                    chatflowDomain: req.auth?.payload?.chatflowDomain
                })
            })
        } catch (err) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.saveChatflow - AnswerAI sync failed!`)
        }

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSinglePublicChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.getSinglePublicChatflow - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.getSinglePublicChatflow(req.params.id, req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSinglePublicChatbotConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.getSinglePublicChatbotConfig - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.getSinglePublicChatbotConfig(req.params.id, req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

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
        const isPro = subscription?.status === 'active' && subscription.items.data[0]?.price.id === BILLING_CONFIG.PRICE_IDS.PAID_MONTHLY
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
        const traceId = req.body.trace_id

        const billingService = new BillingService()
        const result = await billingService.syncUsageToStripe(traceId)
        return res.json({
            status: 'success',
            ...result
        })
    } catch (error) {
        console.error('Error syncing usage:', error)
        next(error)
    }
}

const attachPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const paymentMethod = await billingService.attachPaymentMethod(req.body)
        return res.json(paymentMethod)
    } catch (error) {
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

const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const subscription = await billingService.updateSubscription({
            subscriptionId: req.params.id,
            ...req.body
        })
        return res.json(subscription)
    } catch (error) {
        next(error)
    }
}

const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        // Check if user is authenticated
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
        }

        const subscriptionId = req.params.id
        if (!subscriptionId || typeof subscriptionId !== 'string') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Valid subscription ID is required')
        }

        // At this point TypeScript knows subscriptionId is a string
        // Verify subscription belongs to the user
        const subscription = await billingService.getSubscriptionWithUsage(req.user.stripeCustomerId!)
        if (!subscription || subscription.id !== subscriptionId) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Subscription not found or does not belong to the user')
        }

        // Cancel the subscription
        const canceledSubscription = await billingService.cancelSubscription(subscriptionId as string)
        return res.json(canceledSubscription)
    } catch (error: any) {
        if (error instanceof InternalFlowiseError) {
            next(error)
        } else {
            next(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to cancel subscription: ${error.message}`))
        }
    }
}

const getUpcomingInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const invoice = await billingService.getUpcomingInvoice(req.body)
        return res.json(invoice)
    } catch (error) {
        next(error)
    }
}

const createBillingPortalSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const session = await billingService.createBillingPortalSession({
            customerId: req.body.customerId,
            returnUrl: req.body.returnUrl
        })
        return res.json(session)
    } catch (error) {
        next(error)
    }
}

const getSubscriptionWithUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        // Check if user is authenticated
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
        }

        const customerId = req.user.stripeCustomerId
        if (!customerId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'No Stripe customer ID associated with user')
        }

        // Get active subscription
        const subscription = await billingService.getSubscriptionWithUsage(customerId)

        // if (!subscriptions.data.length) {
        //     return res.json({ subscription: null, usage: [] })
        // }

        // // Get subscription with usage
        // const subscription = await billingService.getSubscriptionWithUsage(subscriptions.data[0].id)
        return res.json(subscription)
    } catch (error: any) {
        if (error instanceof InternalFlowiseError) {
            next(error)
        } else {
            next(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, error.message))
        }
    }
}

const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const sig = req.headers['stripe-signature']
        if (!sig || Array.isArray(sig)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid Stripe signature')
        }

        const event = await billingService.handleWebhook(req.body, sig)
        return res.json({ received: true, type: event.type })
    } catch (error) {
        next(error)
    }
}

// const trackUsage = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const { type, amount } = req.body
//         if (!type || !amount) {
//             throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required parameters: type, amount')
//         }

//         const userId = req.user?.id
//         if (!userId) {
//             throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')
//         }

//         const result = await billingService.trackUsage(userId, type, amount)
//         return res.json(result)
//     } catch (error) {
//         next(error)
//     }
// }

export const getCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billingService = new BillingService()
        const customerId = req.user?.stripeCustomerId

        if (!customerId) {
            return res.status(400).json({ error: 'Customer ID not found' })
        }

        const [customer, subscription, usage] = await Promise.all([
            billingService.getCustomer(customerId),
            billingService.getActiveSubscription(customerId),
            billingService.getUsageSummary(customerId)
        ])

        // Calculate billing period
        const now = new Date()
        const billingPeriodStart = subscription ? new Date(subscription.current_period_start * 1000) : now
        const billingPeriodEnd = subscription
            ? new Date(subscription.current_period_end * 1000)
            : new Date(now.setMonth(now.getMonth() + 1))
        const daysRemaining = Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Determine plan type and limits
        const isPro = subscription?.status === 'active' && subscription.items.data[0]?.price.id === BILLING_CONFIG.PRICE_IDS.PAID_MONTHLY
        const planLimits = isPro ? BILLING_CONFIG.PLAN_LIMITS.PRO : BILLING_CONFIG.PLAN_LIMITS.FREE

        const customerStatus: CustomerStatus = {
            plan: {
                type: isPro ? 'Pro' : 'Free',
                status: subscription?.status === 'active' ? 'active' : 'inactive',
                price: isPro ? 20 : 0, // $20 for Pro plan
                billingPeriod: 'month',
                features: ['Full API access', 'Community support', 'All features included', 'Usage analytics'],
                limits: {
                    creditsPerMonth: planLimits,
                    apiAccess: true,
                    communitySupport: true,
                    usageAnalytics: true
                }
            },
            usage: {
                current: usage.total_credits || 0,
                limit: planLimits,
                percentageUsed: ((usage.total_credits || 0) / planLimits) * 100,
                breakdown: {
                    aiTokens: usage.usageByMeter?.ai_tokens || 0,
                    compute: usage.usageByMeter?.compute || 0,
                    storage: usage.usageByMeter?.storage || 0
                }
            },
            billingPeriod: {
                start: billingPeriodStart,
                end: billingPeriodEnd,
                daysRemaining
            },
            accountStatus: {
                isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
                isTrial: subscription?.status === 'trialing',
                isBlocked: customer.metadata.blocked === 'true',
                blockReason: customer.metadata.blockReason
            }
        }

        res.json(customerStatus)
    } catch (error) {
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
    checkIfChatflowIsValidForStreaming,
    checkIfChatflowIsValidForUploads,
    deleteChatflow,
    getAllChatflows,
    getChatflowByApiKey,
    getChatflowById,
    saveChatflow,
    importChatflows,
    updateChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig,
    getUsageSummary,
    usageSyncHandler,
    attachPaymentMethod,
    createCheckoutSession,
    updateSubscription,
    cancelSubscription,
    getUpcomingInvoice,
    createBillingPortalSession,
    getSubscriptionWithUsage,
    handleWebhook,
    getCustomerStatus,
    getUsageEvents
    // trackUsage
}
