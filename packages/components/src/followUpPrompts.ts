import { FollowUpPromptConfig, FollowUpPromptProvider, ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatMistralAI } from '@langchain/mistralai'
import { AzureChatOpenAI, ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

const FollowUpPromptType = z.object({
    questions: z.array(z.string())
})

export const generateFollowUpPrompts = async (
    followUpPromptsConfig: FollowUpPromptConfig,
    apiMessageContent: string,
    options: ICommonObject
) => {
    if (followUpPromptsConfig) {
        const providerConfig = followUpPromptsConfig[followUpPromptsConfig.selectedProvider]
        const credentialId = providerConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const followUpPromptsPrompt = providerConfig.prompt.replace('{history}', apiMessageContent)

        switch (followUpPromptsConfig.selectedProvider) {
            case FollowUpPromptProvider.ANTHROPIC: {
                const model = new ChatAnthropic({
                    apiKey: credentialData.anthropicApiKey,
                    model: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType)
                const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                return structuredResponse
            }
            case FollowUpPromptProvider.AZURE_OPENAI: {
                const azureOpenAIApiKey = credentialData['azureOpenAIApiKey']
                const azureOpenAIApiInstanceName = credentialData['azureOpenAIApiInstanceName']
                const azureOpenAIApiDeploymentName = credentialData['azureOpenAIApiDeploymentName']
                const azureOpenAIApiVersion = credentialData['azureOpenAIApiVersion']
                const model = new AzureChatOpenAI({
                    azureOpenAIApiKey,
                    azureOpenAIApiInstanceName,
                    azureOpenAIApiDeploymentName,
                    azureOpenAIApiVersion,
                    modelName: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType)
                const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                return structuredResponse
            }
            case FollowUpPromptProvider.MISTRALAI: {
                const model = new ChatMistralAI({
                    apiKey: credentialData.mistralAIAPIKey,
                    modelName: providerConfig.modelName,
                    temperature: parseFloat(`${providerConfig.temperature}`)
                })
                const structuredLLM = model.withStructuredOutput(FollowUpPromptType)
                const structuredResponse = await structuredLLM.invoke(followUpPromptsPrompt)
                return structuredResponse
            }
            case FollowUpPromptProvider.OPENAI: {
                const model = new ChatOpenAI({
                    apiKey: credentialData.openAIAPIKey,
                    modelName: providerConfig.modelName,
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
