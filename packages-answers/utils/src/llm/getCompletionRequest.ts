import { Message, User, Organization } from 'types'
import { ChatCompletionRequestMessageRoleEnum } from 'openai'
import { countTokens } from '../utilities/countTokens'
import { renderTemplate } from '../utilities/renderTemplate'
import getUserContextFields from '../utilities/getUserContextFields'
import getOrganizationContextFields from '../utilities/getOrganizationContextFields'
import { getRemainingAvailableTokens } from '../getRemainingAvailableTokens'
import { Sidekick } from 'db/generated/prisma-client'

export async function getCompletionRequest({
    context,
    user,
    organization,
    messages,
    input,
    sidekick,
    gptModel
}: {
    context: string
    user?: User
    organization?: Organization
    messages?: Message[]
    input: string
    sidekick?: Sidekick
    gptModel?: string
}) {
    // Get organization's custom contact fields
    const organizationContext: Record<string, any> = getOrganizationContextFields(organization)

    // Get user's custom context fields
    const userContext: Record<string, any> = getUserContextFields(user)

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

    const temperature = sidekick?.temperature || 0.1
    const frequency = sidekick?.frequency || 0
    const presence = sidekick?.presence || 0
    const sidekickModel = gptModel || sidekick?.aiModel || 'gpt-3.5-turbo'
    const maxCompletionTokens = sidekick?.maxCompletionTokens || 500

    let remainingAvailableTokens = await getRemainingAvailableTokens({
        sidekick,
        input,
        context,
        organizationContext,
        userContext,
        model: gptModel
    })

    let filteredMessages: Message[] = []

    if (messages) {
        for (const message of messages) {
            const contentTokens = await countTokens(message.content)
            if (remainingAvailableTokens > contentTokens) {
                filteredMessages.push(message)
                remainingAvailableTokens -= contentTokens
            } else {
                break
            }
        }
    }

    const fullMessage = [...filteredMessages, { role: 'user', content: userPrompt }]

    return {
        max_tokens: maxCompletionTokens,
        messages: [
            {
                role: ChatCompletionRequestMessageRoleEnum.System,
                content: systemPrompt
            },
            ...fullMessage.map((message) => ({
                role: message.role === 'user' ? ChatCompletionRequestMessageRoleEnum.User : ChatCompletionRequestMessageRoleEnum.Assistant,
                content: message.content
            }))
        ],
        frequency_penalty: frequency,
        presence_penalty: presence,
        temperature: temperature,
        model: sidekickModel
    }
}
