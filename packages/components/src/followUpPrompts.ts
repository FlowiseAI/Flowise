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

const FollowUpPromptType = z
    .object({
        questions: z.array(z.string())
    })
    .describe('Generate Follow Up Prompts')

export interface FollowUpPromptResult {
    questions: string[]
}

interface FollowUpPromptGenerationOptions {
    timeoutMs?: number
    maxRetries?: number
}

type FollowUpPromptTask<T> = () => Promise<T>

const DEFAULT_FOLLOW_UP_PROMPT_TIMEOUT_MS = 10000
const DEFAULT_FOLLOW_UP_PROMPT_MAX_RETRIES = 1

class FollowUpPromptTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Follow-up prompt generation timed out after ${timeoutMs}ms`)
        this.name = 'FollowUpPromptTimeoutError'
    }
}

const createTimeoutPromise = <T>(timeoutMs: number): { promise: Promise<T>; clear: () => void } => {
    let timeout: NodeJS.Timeout
    const promise = new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new FollowUpPromptTimeoutError(timeoutMs)), timeoutMs)
    })

    return {
        promise,
        clear: () => clearTimeout(timeout)
    }
}

const invokeWithTimeoutAndRetry = async <T>(
    task: FollowUpPromptTask<T>,
    options: FollowUpPromptGenerationOptions = {}
): Promise<T | undefined> => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_FOLLOW_UP_PROMPT_TIMEOUT_MS
    const maxRetries = options.maxRetries ?? DEFAULT_FOLLOW_UP_PROMPT_MAX_RETRIES

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const timeout = createTimeoutPromise<T>(timeoutMs)

        try {
            const taskPromise = task()
            taskPromise.catch(() => undefined)

            return await Promise.race([taskPromise, timeout.promise])
        } catch {
            if (attempt === maxRetries) return undefined
        } finally {
            timeout.clear()
        }
    }

    return undefined
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
        const credentialId = providerConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const followUpPromptsPrompt = providerConfig.prompt.replace('{history}', apiMessageContent)

        switch (followUpPromptsConfig.selectedProvider) {
            case FollowUpPromptProvider.ANTHROPIC: {
                const llm = new ChatAnthropic({
                    apiKey: credentialData.anthropicApiKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                // @ts-ignore
                const structuredLLM = llm.withStructuredOutput(FollowUpPromptType, {
                    method: 'functionCalling'
                })
                return await invokeWithTimeoutAndRetry(async () => {
                    const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                    return structuredResponse as FollowUpPromptResult
                })
            }
            case FollowUpPromptProvider.AZURE_OPENAI: {
                const azureOpenAIApiKey = credentialData['azureOpenAIApiKey']
                const azureOpenAIApiInstanceName = credentialData['azureOpenAIApiInstanceName']
                const azureOpenAIApiDeploymentName = credentialData['azureOpenAIApiDeploymentName']
                const azureOpenAIApiVersion = credentialData['azureOpenAIApiVersion']

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
                return await invokeWithTimeoutAndRetry(async () => {
                    const structuredResponse = await chain.invoke({
                        history: apiMessageContent,
                        format_instructions: formatInstructions
                    })
                    return structuredResponse as FollowUpPromptResult
                })
            }
            case FollowUpPromptProvider.GOOGLE_GENAI: {
                const model = new ChatGoogleGenerativeAI({
                    apiKey: credentialData.googleGenerativeAPIKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType, {
                    method: 'functionCalling'
                })
                return await invokeWithTimeoutAndRetry(async () => {
                    const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                    return structuredResponse as FollowUpPromptResult
                })
            }
            case FollowUpPromptProvider.MISTRALAI: {
                const model = new ChatMistralAI({
                    apiKey: credentialData.mistralAIAPIKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                // @ts-ignore
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType, {
                    method: 'functionCalling'
                })
                return await invokeWithTimeoutAndRetry(async () => {
                    const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                    return structuredResponse as FollowUpPromptResult
                })
            }
            case FollowUpPromptProvider.OPENAI: {
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
                return await invokeWithTimeoutAndRetry(async () => {
                    const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                    return structuredResponse as FollowUpPromptResult
                })
            }
            case FollowUpPromptProvider.GROQ: {
                const llm = new ChatGroq({
                    apiKey: credentialData.groqApiKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = llm.withStructuredOutput(FollowUpPromptType, {
                    method: 'functionCalling'
                })
                return await invokeWithTimeoutAndRetry(async () => {
                    const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                    return structuredResponse as FollowUpPromptResult
                })
            }
            case FollowUpPromptProvider.OLLAMA: {
                const ollamaClient = new Ollama({
                    host: providerConfig.baseUrl || 'http://127.0.0.1:11434'
                })

                return await invokeWithTimeoutAndRetry(async () => {
                    const response = await ollamaClient.chat({
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
                    const result = FollowUpPromptType.parse(JSON.parse(response.message.content))
                    return result
                })
            }
        }
    } else {
        return undefined
    }
}
