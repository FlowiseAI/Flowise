import { IServerSideEventStreamer } from '../../src'

export abstract class Moderation {
    abstract checkForViolations(input: string): Promise<string>
}

export const checkInputs = async (inputModerations: Moderation[], input: string): Promise<string> => {
    for (const moderation of inputModerations) {
        input = await moderation.checkForViolations(input)
    }
    return input
}

// is this the correct location for this function?
// should we have a utils files that all node components can use?
export const streamResponse = (sseStreamer: IServerSideEventStreamer, chatId: string, response: string) => {
    const result = response.split(/(\s+)/)
    result.forEach((token: string, index: number) => {
        if (index === 0) {
            sseStreamer.streamStartEvent(chatId, token)
        }
        sseStreamer.streamTokenEvent(chatId, token)
    })
    sseStreamer.streamEndEvent(chatId)
}
