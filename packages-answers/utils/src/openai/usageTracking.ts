import { GPTTokens } from 'gpt-tokens'
import {
    ChatCompletionRequestMessage,
    CreateChatCompletionRequest,
    CreateChatCompletionResponse,
    CreateCompletionRequest,
    CreateCompletionResponse,
    CreateEmbeddingResponse
} from 'openai'

import { inngest } from '../ingest/client'
import { User } from 'types'
import { updateUserPlanTokenCount } from '../plans/updateUserPlanTokenCount'

const OPENAI_TYPE = 'openai'

export const trackUsageFromMessages = async ({
    type,
    method,
    model,
    messages,
    messageId,
    user,
    request
}: {
    type?: string
    method: string
    model: string
    messageId?: string
    messages: ChatCompletionRequestMessage[]
    user: User
    request?: any
}) => {
    const gptTokens = new GPTTokens({
        model: model as any,
        messages
    })
    return trackUsageFromTokens({
        type,
        method,
        model,
        messageId,
        promptUsedTokens: gptTokens.promptUsedTokens,
        completionUsedTokens: gptTokens.completionUsedTokens,
        user,
        request
    })
}

export const trackUsageFromTokens = async ({
    type = OPENAI_TYPE,
    method,
    model,
    messageId,
    promptUsedTokens,
    completionUsedTokens,
    user,
    request,
    isCacheHit,
    isEmbedding
}: {
    type?: string
    method: string
    model: string
    messageId?: string
    promptUsedTokens: number
    completionUsedTokens: number
    user: User
    request?: any
    isCacheHit?: boolean
    isEmbedding?: boolean
}) => {
    await inngest.send({
        v: '1',
        ts: new Date().valueOf(),
        name: 'tracking/ai.usage',
        user,
        data: {
            type,
            method,
            model,
            promptUsedTokens,
            completionUsedTokens,
            isCacheHit,
            messageId,
            request
        }
    })
    if (!isEmbedding) {
        await updateUserPlanTokenCount(user, promptUsedTokens + completionUsedTokens, model)
    }
}

export const trackCompletionUsage = async ({
    type,
    method,
    request,
    response,
    messageId,
    user
}: {
    type?: string
    method: string
    request: CreateCompletionRequest
    response: CreateCompletionResponse
    messageId?: string
    user: User
}) => {
    if (response.usage?.prompt_tokens && response.usage?.completion_tokens) {
        trackUsageFromTokens({
            type,
            method,
            model: response.model,
            promptUsedTokens: response.usage.prompt_tokens,
            completionUsedTokens: response.usage.completion_tokens,
            user,
            request
        })
    }
}

export const trackChatCompletionUsage = async ({
    type,
    method,
    request,
    response,
    messageId,
    model,
    user
}: {
    type?: string
    method: string
    request: CreateChatCompletionRequest
    response: CreateChatCompletionResponse
    messageId?: string
    model: string
    user: User
}) =>
    trackUsageFromMessages({
        type,
        method,
        model: response.model,
        messages: [...request.messages, ...(response.choices[0]?.message ? [response.choices[0]?.message] : [])],
        user,
        request
    })

export const trackEmbeddingUsage = async ({
    type,
    method,
    model,
    response,
    user,
    isCacheHit
}: {
    type?: string
    method: string
    model: string
    response: CreateEmbeddingResponse
    user: User
    isCacheHit: boolean
}) => {
    if (response.usage?.prompt_tokens && response.usage?.total_tokens) {
        await trackUsageFromTokens({
            type,
            method,
            model,
            promptUsedTokens: response.usage.prompt_tokens,
            completionUsedTokens: response.usage.total_tokens - response.usage.prompt_tokens,
            user,
            isCacheHit,
            isEmbedding: true
        })
    }
}
