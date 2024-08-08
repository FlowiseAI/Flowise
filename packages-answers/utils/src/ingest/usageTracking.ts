import { EventVersionHandler } from './EventVersionHandler'
import { prisma } from '@db/client'
import { Prisma } from 'db/generated/prisma-client'

// import Prisma.Decimal from

// https://openai.com/pricing/
// gpt-3.5-turbo
// $0.002 / 1K tokens
const gpt3_5_turboTokenUnit = new Prisma.Decimal(0.002).div(1000)
// https://openai.com/pricing/
// gpt-3.5-turbo-16k
// Prompt: $0.003 / 1K tokens
const gpt3_5_turbo_16kPromptTokenUnit = new Prisma.Decimal(0.003).div(1000)
// https://openai.com/pricing/
// gpt-3.5-turbo-16k
// Prompt: $0.004 / 1K tokens
const gpt3_5_turbo_16kCompletionTokenUnit = new Prisma.Decimal(0.004).div(1000)
// https://openai.com/pricing/
// gpt-4-8k
// Prompt: $0.03 / 1K tokens
//
const gpt4_8kPromptTokenUnit = new Prisma.Decimal(0.03).div(1000)
// https://openai.com/pricing/
// gpt-4-8k
// Completion: $0.06 / 1K tokens
const gpt4_8kCompletionTokenUnit = new Prisma.Decimal(0.06).div(1000)
// https://openai.com/pricing/
// gpt-4-32k
// Prompt: $0.06 / 1K tokens
const gpt4_32kPromptTokenUnit = new Prisma.Decimal(0.06).div(1000)
// https://openai.com/pricing/
// gpt-4-32k
// Completion: $0.12 / 1K tokens
const gpt4_32kCompletionTokenUnit = new Prisma.Decimal(0.12).div(1000)
// https://openai.com/pricing/
// text-embedding-ada-002
// $0.0001 / 1K tokens
const embedding_ada_v2TokenUnit = new Prisma.Decimal(0.0001).div(1000)

export const tokensToUSD = ({
    promptUsedTokens,
    completionUsedTokens,
    model
}: {
    promptUsedTokens: number
    completionUsedTokens: number
    model: string
}): Prisma.Decimal => {
    const usedTokens = promptUsedTokens + completionUsedTokens
    let price = new Prisma.Decimal(0)
    if (['text-embedding-ada-002'].includes(model)) {
        price = new Prisma.Decimal(usedTokens).mul(embedding_ada_v2TokenUnit)
    }
    if (['gpt-3.5-turbo', 'gpt-3.5-turbo-0301', 'gpt-3.5-turbo-0613'].includes(model))
        price = new Prisma.Decimal(usedTokens).mul(gpt3_5_turboTokenUnit)
    if (['gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k-0613'].includes(model)) {
        const promptUSD = new Prisma.Decimal(promptUsedTokens).mul(gpt3_5_turbo_16kPromptTokenUnit)
        const completionUSD = new Prisma.Decimal(completionUsedTokens).mul(gpt3_5_turbo_16kCompletionTokenUnit)
        price = promptUSD.add(completionUSD)
    }
    if (['gpt-4', 'gpt-4-0314', 'gpt-4-0613'].includes(model)) {
        const promptUSD = new Prisma.Decimal(promptUsedTokens).mul(gpt4_8kPromptTokenUnit)
        const completionUSD = new Prisma.Decimal(completionUsedTokens).mul(gpt4_8kCompletionTokenUnit)
        price = promptUSD.add(completionUSD)
    }
    if (['gpt-4-32k', 'gpt-4-32k-0314', 'gpt-4-32k-0613'].includes(model)) {
        const promptUSD = new Prisma.Decimal(promptUsedTokens).mul(gpt4_32kPromptTokenUnit)
        const completionUSD = new Prisma.Decimal(completionUsedTokens).mul(gpt4_32kCompletionTokenUnit)
        price = promptUSD.add(completionUSD)
    }
    return model.startsWith('gpt-3.5-turbo') ? new Prisma.Decimal(price).mul(0.75) : price
}

export const processAiUsage: EventVersionHandler<{
    type: string
    method: string
    model: string
    promptUsedTokens: number
    completionUsedTokens: number
    isCacheHit: boolean
    messageId?: string
    request?: any
}> = {
    event: 'tracking/ai.usage',
    v: '1',
    handler: async ({ event }) => {
        const data = event.data
        const user = event.user

        if (!user?.id) {
            throw new Error(`tracking/ai.usage: No user found`)
        }

        const totalTokensUsed = (data.promptUsedTokens || 0) + (data.completionUsedTokens || 0)
        const costUsdTotal = tokensToUSD({
            model: data.model,
            promptUsedTokens: data.promptUsedTokens || 0,
            completionUsedTokens: data.completionUsedTokens || 0
        })

        // create a new usage tracking record
        const aiRecord = await prisma.aiRequest.create({
            data: {
                type: data.type,
                method: data.method,
                user: {
                    connect: {
                        id: user.id
                    }
                },
                model: data.model,
                tokensUsed: data.isCacheHit ? 0 : totalTokensUsed,
                tokensUsedUser: totalTokensUsed,
                costUsdTotal: data.isCacheHit ? new Prisma.Decimal(0) : costUsdTotal,
                costUsdTotalUser: costUsdTotal,
                request: data.request,
                ...(data.messageId && {
                    message: {
                        connect: {
                            id: data.messageId
                        }
                    }
                })
            }
        })
    }
}
