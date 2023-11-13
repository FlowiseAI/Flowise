import { Moderation } from '../ResponsibleAI'
import { BaseLanguageModel } from 'langchain/base_language'
import { OpenAIModerationChain } from 'langchain/chains'

export class OpenAIModerationRunner implements Moderation {
    private moderationConfig: string = 'useDefault'
    private moderationErrorMessage: string = "Text was found that violates OpenAI's content policy."
    private sexual: number = 0.01
    private sexualMinors: number = 0.01
    private hate: number = 0.01
    private hateThreatening: number = 0.01
    private harassment: number = 0.01
    private harassmentThreatening: number = 0.01
    private selfHarm: number = 0.01
    private selfHarmIntent: number = 0.01
    private selfHarmInstructions: number = 0.01
    private violence: number = 0.01
    private violenceGraphic: number = 0.01

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
        if (this.moderationConfig != 'useCustom' && results[0].flagged) {
            throw Error(this.moderationErrorMessage)
        }
        if (this.moderationConfig != 'useDefault') {
            const categoryScores = results[0].category_scores
            if (
                categoryScores['harassment'] > this.harassment ||
                categoryScores['harassment/threatening'] > this.harassmentThreatening ||
                categoryScores['self-harm'] > this.selfHarm ||
                categoryScores['self-harm/intent'] > this.selfHarmIntent ||
                categoryScores['self-harm/instructions'] > this.selfHarmInstructions ||
                categoryScores['sexual'] > this.sexual ||
                categoryScores['sexual/minors'] > this.sexualMinors ||
                categoryScores['hate'] > this.hate ||
                categoryScores['hate/threatening'] > this.hateThreatening ||
                categoryScores['violence'] > this.violence ||
                categoryScores['violence/graphic'] > this.violenceGraphic
            ) {
                throw Error(this.moderationErrorMessage)
            }
        }
        return moderationOutput
    }

    setParameter(category: string, value: number) {
        // @ts-ignore
        this[category] = value
    }
}
