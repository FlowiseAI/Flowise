import { Moderation } from '../Moderation'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

export class SimplePromptModerationRunner implements Moderation {
    private readonly denyList: string = ''
    private readonly moderationErrorMessage: string = ''
    private readonly model: BaseChatModel

    constructor(denyList: string, moderationErrorMessage: string, model?: BaseChatModel) {
        this.denyList = denyList
        if (denyList.indexOf('\n') === -1) {
            this.denyList += '\n'
        }
        this.moderationErrorMessage = moderationErrorMessage
        if (model) this.model = model
    }

    async checkForViolations(input: string): Promise<string> {
        if (this.model) {
            const denyArray = this.denyList.split('\n')
            for (const denyStr of denyArray) {
                if (!denyStr || denyStr === '') continue
                const res = await this.model.invoke(
                    `Are these two sentences similar to each other? Only return Yes or No.\nFirst sentence: ${input}\nSecond sentence: ${denyStr}`
                )
                if (res.content.toString().toLowerCase().includes('yes')) {
                    throw Error(this.moderationErrorMessage)
                }
            }
        } else {
            this.denyList.split('\n').forEach((denyListItem) => {
                if (denyListItem && denyListItem !== '' && input.toLowerCase().includes(denyListItem.toLowerCase())) {
                    throw Error(this.moderationErrorMessage)
                }
            })
        }
        return Promise.resolve(input)
    }
}
