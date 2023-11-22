import { Moderation } from '../ResponsibleAI'
import { BaseLanguageModel } from 'langchain/base_language'
import { OpenAIModerationChain } from 'langchain/chains'

export class OpenAIModerationRunner implements Moderation {
    private moderationErrorMessage: string = "Text was found that violates OpenAI's content policy."

    async checkForViolations(llm: BaseLanguageModel, input: string): Promise<string> {
        const openAIApiKey = (llm as any).openAIApiKey
        if (!openAIApiKey) {
            throw Error('OpenAI API key not found')
        }
        // Create a new instance of the OpenAIModerationChain
        const moderation = new OpenAIModerationChain({
            openAIApiKey: openAIApiKey,
            throwError: false // If set to true, the call will throw an error when the moderation chain detects violating content. If set to false, violating content will return "Text was found that violates OpenAI's content policy.".
        })
        // Send the user's input to the moderation chain and wait for the result
        const { output: moderationOutput, results } = await moderation.call({
            input: input
        })
        if (results[0].flagged) {
            throw Error(this.moderationErrorMessage)
        }
        return moderationOutput
    }

    setErrorMessage(message: string) {
        this.moderationErrorMessage = message
    }
}
