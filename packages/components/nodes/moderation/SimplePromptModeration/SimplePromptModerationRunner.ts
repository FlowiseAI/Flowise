import { Moderation } from '../Moderation'

export class SimplePromptModerationRunner implements Moderation {
    private readonly denyList: string = ''
    private readonly moderationErrorMessage: string = ''

    constructor(denyList: string, moderationErrorMessage: string) {
        this.denyList = denyList
        if (denyList.indexOf('\n') === -1) {
            this.denyList += '\n'
        }
        this.moderationErrorMessage = moderationErrorMessage
    }

    async checkForViolations(input: string): Promise<string> {
        this.denyList.split('\n').forEach((denyListItem) => {
            if (denyListItem && denyListItem !== '' && input.includes(denyListItem)) {
                throw Error(this.moderationErrorMessage)
            }
        })
        return Promise.resolve(input)
    }
}
