import { renderTemplate } from './utilities/renderTemplate'
import { countTokens } from './utilities/countTokens'
import getMaxTokensByModel from './utilities/getMaxTokensByModel'
import { Sidekick } from 'db/generated/prisma-client'

//Calculates the remaining available tokens for a given input and optional context.
export interface GetRemainingAvailableTokensProps {
    sidekick?: Sidekick
    input: string
    context?: any
    organizationContext: Record<string, any>
    userContext: Record<string, any>
    model?: string
}

export const getRemainingAvailableTokens = async ({
    sidekick,
    input,
    context = '',
    organizationContext,
    userContext,
    model
}: GetRemainingAvailableTokensProps) => {
    const systemPrompt = sidekick?.systemPromptTemplate
        ? renderTemplate(sidekick.systemPromptTemplate, {
              input,
              context,
              user: userContext,
              organization: organizationContext
          })
        : ''

    const userPrompt = sidekick?.userPromptTemplate
        ? renderTemplate(sidekick.userPromptTemplate, {
              userInput: input,
              context,
              user: userContext,
              organization: organizationContext
          })
        : input

    const sidekickModel = model || sidekick?.aiModel || 'gpt-3.5-turbo'
    const maxCompletionTokens = sidekick?.maxCompletionTokens || 500

    const maxTokens = getMaxTokensByModel(sidekickModel) - maxCompletionTokens

    const systemPromptTokens = await countTokens(systemPrompt)
    const userPromptTokens = await countTokens(userPrompt)
    const remainingTokens = maxTokens - (systemPromptTokens + userPromptTokens)

    return remainingTokens > 0 ? remainingTokens : 0
}
