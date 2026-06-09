import { FollowUpPromptConfig, FollowUpPromptProvider, ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai'
import { z } from 'zod/v3'
import { PromptTemplate } from '@langchain/core/prompts'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { ChatGroq } from '@langchain/groq'
import { Ollama } from 'ollama'

const FOLLOWUP_TIMEOUT_MS = 15000
const FOLLOWUP_MAX_RETRIES = 2
const FOLLOWUP_RETRY_BASE_DELAY_MS = 500

const FollowUpPromptType = z
    .object({
        questions: z.array(z.string())
    })
    .describe('Generate Follow Up Prompts')

export interface FollowUpPromptResult {
    questions: string[]
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const getErrorStatus = (error: any): number | undefined => {
    return error?.status ?? error?.statusCode ?? error?.response?.status ?? error?.cause?.status
}

const isTimeoutError = (error: any): boolean => {
    const errorCode = error?.code
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return true
    if (typeof error?.message === 'string' && /timeout|timed out/i.test(error.message)) return true
    return ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED'].includes(errorCode)
}

const isRetryableError = (error: any): boolean => {
    const status = getErrorStatus(error)
    if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true
    return isTimeoutError(error)
}

const executeWithRetry = async <T>(
    action: (signal: AbortSignal) => Promise<T>,
    options: {
        provider: string
        timeoutMs: number
        maxRetries?: number
        baseDelayMs?: number
        logger?: { error?: (message: string) => void }
    }
): Promise<T> => {
    const maxRetries = options.maxRetries ?? FOLLOWUP_MAX_RETRIES
    const baseDelayMs = options.baseDelayMs ?? FOLLOWUP_RETRY_BASE_DELAY_MS

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), options.timeoutMs)
        let abortHandler: (() => void) | undefined
        const abortPromise = new Promise<never>((_, reject) => {
            abortHandler = () => {
                const timeoutError = new Error('Follow-up prompt request timed out')
                timeoutError.name = 'TimeoutError'
                reject(timeoutError)
            }
            abortController.signal.addEventListener('abort', abortHandler, { once: true })
        })

        try {
            const result = await Promise.race([action(abortController.signal), abortPromise])
            return result as T
        } catch (error: any) {
            const retryable = isRetryableError(error)
            const retryCount = attempt
            const status = getErrorStatus(error)
            const message = error?.message ?? 'Unknown error'
            options.logger?.error?.(
                `[FollowUpPrompt] ${JSON.stringify({
                    provider: options.provider,
                    retryCount,
                    timeoutMs: options.timeoutMs,
                    status,
                    message,
                    retryable
                })}`
            )

            if (!retryable || attempt >= maxRetries) {
                throw error
            }

            const delayMs = baseDelayMs * Math.pow(2, attempt)
            await sleep(delayMs)
        } finally {
            clearTimeout(timeoutId)
            if (abortHandler) abortController.signal.removeEventListener('abort', abortHandler)
        }
    }

    throw new Error('Follow-up prompt retry attempts exhausted')
}

export const generateFollowUpPrompts = async (
    followUpPromptsConfig: FollowUpPromptConfig,
    apiMessageContent: string,
    options: ICommonObject
): Promise<FollowUpPromptResult | undefined> => {
    if (followUpPromptsConfig) {
        if (!followUpPromptsConfig.status) return undefined
        const providerConfig = followUpPromptsConfig[followUpPromptsConfig.selectedProvider]
        if (!providerConfig) return undefined
        const logger = options?.logger
        const timeoutFromOptions = options?.followUpPromptTimeoutMs ?? process.env.FOLLOW_UP_PROMPT_TIMEOUT_MS
        const timeoutMs = Number(timeoutFromOptions)
        const resolvedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : FOLLOWUP_TIMEOUT_MS
        const credentialId = providerConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const followUpPromptsPrompt = providerConfig.prompt.replace('{history}', apiMessageContent)

        switch (followUpPromptsConfig.selectedProvider) {
            case FollowUpPromptProvider.ANTHROPIC: {
                return executeWithRetry(
                    async (signal) => {
                        const llm = new ChatAnthropic({
                            apiKey: credentialData.anthropicApiKey,
                            model: providerConfig.modelName,
                            temperature: parseFloat(`${providerConfig.temperature}`)
                        })
                        // @ts-ignore
                        const structuredLLM = llm.withStructuredOutput(FollowUpPromptType, {
                            method: 'functionCalling'
                        })
                        const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt, { signal })
                        return structuredResponse as FollowUpPromptResult
                    },
                    {
                        provider: FollowUpPromptProvider.ANTHROPIC,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
            case FollowUpPromptProvider.AZURE_OPENAI: {
                const azureOpenAIApiKey = credentialData['azureOpenAIApiKey']
                const azureOpenAIApiInstanceName = credentialData['azureOpenAIApiInstanceName']
                const azureOpenAIApiDeploymentName = credentialData['azureOpenAIApiDeploymentName']
                const azureOpenAIApiVersion = credentialData['azureOpenAIApiVersion']

                return executeWithRetry(
                    async (signal) => {
                        const llm = new AzureChatOpenAI({
                            azureOpenAIApiKey,
                            azureOpenAIApiInstanceName,
                            azureOpenAIApiDeploymentName,
                            azureOpenAIApiVersion,
                            model: providerConfig.modelName,
                            temperature: parseFloat(`${providerConfig.temperature}`)
                        })
                        // use structured output parser because withStructuredOutput is not working
                        const parser = StructuredOutputParser.fromZodSchema(FollowUpPromptType as any)
                        const formatInstructions = parser.getFormatInstructions()
                        const prompt = PromptTemplate.fromTemplate(`
                            ${providerConfig.prompt}
                                        
                            {format_instructions}
                        `)
                        const chain = prompt.pipe(llm).pipe(parser)
                        const structuredResponse = await chain.invoke(
                            {
                                history: apiMessageContent,
                                format_instructions: formatInstructions
                            },
                            { signal }
                        )
                        return structuredResponse as FollowUpPromptResult
                    },
                    {
                        provider: FollowUpPromptProvider.AZURE_OPENAI,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
            case FollowUpPromptProvider.GOOGLE_GENAI: {
                return executeWithRetry(
                    async (signal) => {
                        const model = new ChatGoogleGenerativeAI({
                            apiKey: credentialData.googleGenerativeAPIKey,
                            model: providerConfig.modelName,
                            temperature: parseFloat(`${providerConfig.temperature}`)
                        })
                        const structuredLLM = model.withStructuredOutput(FollowUpPromptType, {
                            method: 'functionCalling'
                        })
                        const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt, { signal })
                        return structuredResponse as FollowUpPromptResult
                    },
                    {
                        provider: FollowUpPromptProvider.GOOGLE_GENAI,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
            case FollowUpPromptProvider.MISTRALAI: {
                return executeWithRetry(
                    async (signal) => {
                        const model = new ChatMistralAI({
                            apiKey: credentialData.mistralAIAPIKey,
                            model: providerConfig.modelName,
                            temperature: parseFloat(`${providerConfig.temperature}`)
                        })
                        // @ts-ignore
                        const structuredLLM = model.withStructuredOutput(FollowUpPromptType, {
                            method: 'functionCalling'
                        })
                        const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt, { signal })
                        return structuredResponse as FollowUpPromptResult
                    },
                    {
                        provider: FollowUpPromptProvider.MISTRALAI,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
            case FollowUpPromptProvider.OPENAI: {
                return executeWithRetry(
                    async (signal) => {
                        const model = new ChatOpenAI({
                            apiKey: credentialData.openAIApiKey,
                            model: providerConfig.modelName,
                            temperature: parseFloat(`${providerConfig.temperature}`),
                            useResponsesApi: true
                        })
                        // @ts-ignore
                        const structuredLLM = model.withStructuredOutput(FollowUpPromptType, {
                            method: 'functionCalling'
                        })
                        const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt, { signal })
                        return structuredResponse as FollowUpPromptResult
                    },
                    {
                        provider: FollowUpPromptProvider.OPENAI,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
            case FollowUpPromptProvider.GROQ: {
                return executeWithRetry(
                    async (signal) => {
                        const llm = new ChatGroq({
                            apiKey: credentialData.groqApiKey,
                            model: providerConfig.modelName,
                            temperature: parseFloat(`${providerConfig.temperature}`)
                        })
                        const structuredLLM = llm.withStructuredOutput(FollowUpPromptType, {
                            method: 'functionCalling'
                        })
                        const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt, { signal })
                        return structuredResponse as FollowUpPromptResult
                    },
                    {
                        provider: FollowUpPromptProvider.GROQ,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
            case FollowUpPromptProvider.OLLAMA: {
                return executeWithRetry(
                    async (signal) => {
                        const ollamaClient = new Ollama({
                            host: providerConfig.baseUrl || 'http://127.0.0.1:11434'
                        })

                        // Ollama client does not accept AbortSignal directly in this SDK call.
                        // Wrap the chat promise in a race so the caller-provided signal can
                        // abort the request and trigger our retry/timeout behavior.
                        const chatPromise = ollamaClient.chat({
                            model: providerConfig.modelName,
                            messages: [
                                {
                                    role: 'user',
                                    content: followUpPromptsPrompt
                                }
                            ],
                            format: {
                                type: 'object',
                                properties: {
                                    questions: {
                                        type: 'array',
                                        items: {
                                            type: 'string'
                                        },
                                        minItems: 3,
                                        maxItems: 3,
                                        description: 'Three follow-up questions based on the conversation history'
                                    }
                                },
                                required: ['questions'],
                                additionalProperties: false
                            },
                            options: {
                                temperature: parseFloat(`${providerConfig.temperature}`)
                            }
                        })

                        let abortHandler: (() => void) | undefined
                        const abortPromise = new Promise<never>((_, reject) => {
                            abortHandler = () => {
                                const timeoutError = new Error('Follow-up prompt request timed out')
                                timeoutError.name = 'TimeoutError'
                                reject(timeoutError)
                            }
                            signal.addEventListener('abort', abortHandler, { once: true })
                        })

                        try {
                            const response = await Promise.race([chatPromise, abortPromise])
                            const result = FollowUpPromptType.parse(JSON.parse((response as any).message.content))
                            if (!result.questions) {
                                throw new Error('Follow-up prompt response missing questions')
                            }
                            return { questions: result.questions }
                        } finally {
                            if (abortHandler) signal.removeEventListener('abort', abortHandler)
                        }
                    },
                    {
                        provider: FollowUpPromptProvider.OLLAMA,
                        timeoutMs: resolvedTimeoutMs,
                        logger
                    }
                )
            }
        }
    } else {
        return undefined
    }
}
