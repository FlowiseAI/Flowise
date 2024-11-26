import { FollowUpPromptConfig, FollowUpPromptProvider, ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import { PromptTemplate } from '@langchain/core/prompts'
import { StructuredOutputParser } from '@langchain/core/output_parsers'

const FollowUpPromptType = z
    .object({
        questions: z.array(z.string())
    })
    .describe('Generate Follow Up Prompts')

export const generateFollowUpPrompts = async (
    followUpPromptsConfig: FollowUpPromptConfig,
    apiMessageContent: string,
    options: ICommonObject
) => {
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
                const structuredLLM = llm.withStructuredOutput(FollowUpPromptType)
                const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                return structuredResponse
            }
            case FollowUpPromptProvider.AZURE_OPENAI: {
                const azureOpenAIApiKey = credentialData['azureOpenAIApiKey']
                const azureOpenAIApiInstanceName = credentialData['azureOpenAIApiInstanceName']
                const azureOpenAIApiDeploymentName = credentialData['azureOpenAIApiDeploymentName']
                const azureOpenAIApiVersion = credentialData['azureOpenAIApiVersion']

                const llm = new ChatOpenAI({
                    azureOpenAIApiKey,
                    azureOpenAIApiInstanceName,
                    azureOpenAIApiDeploymentName,
                    azureOpenAIApiVersion,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                // use structured output parser because withStructuredOutput is not working
                const parser = StructuredOutputParser.fromZodSchema(FollowUpPromptType)
                const formatInstructions = parser.getFormatInstructions()
                const prompt = PromptTemplate.fromTemplate(`
                    ${providerConfig.prompt}
                                
                    {format_instructions}
                `)
                const chain = prompt.pipe(llm).pipe(parser)
                const structuredResponse = await chain.invoke({
                    history: apiMessageContent,
                    format_instructions: formatInstructions
                })
                return structuredResponse
            }
            case FollowUpPromptProvider.GOOGLE_GENAI: {
                const llm = new ChatGoogleGenerativeAI({
                    apiKey: credentialData.googleGenerativeAPIKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                // use structured output parser because withStructuredOutput is not working
                const parser = StructuredOutputParser.fromZodSchema(FollowUpPromptType)
                const formatInstructions = parser.getFormatInstructions()
                const prompt = PromptTemplate.fromTemplate(`
                    ${providerConfig.prompt}
                     
                    {format_instructions}
                `)
                const chain = prompt.pipe(llm).pipe(parser)
                const structuredResponse = await chain.invoke({
                    history: apiMessageContent,
                    format_instructions: formatInstructions
                })
                return structuredResponse
            }
            case FollowUpPromptProvider.MISTRALAI: {
                const model = new ChatMistralAI({
                    apiKey: credentialData.mistralAIAPIKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType)
                const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                return structuredResponse
            }
            case FollowUpPromptProvider.OPENAI: {
                const model = new ChatOpenAI({
                    apiKey: credentialData.openAIApiKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType)
                const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                return structuredResponse
            }
        }
    } else {
        return undefined
    }
}
