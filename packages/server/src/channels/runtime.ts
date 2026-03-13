import { Request } from 'express'
import { utilBuildChatflow } from '../utils/buildChatflow'
import { ChannelPredictionRequest, ChannelPredictionResult, ChannelRuntime } from './types'

export class FlowiseChannelRuntime implements ChannelRuntime {
    async runPrediction(input: ChannelPredictionRequest): Promise<ChannelPredictionResult> {
        const request = this.createInternalRequest(input)
        const result = await utilBuildChatflow(request, true)

        return {
            text: extractTextFromPrediction(result),
            raw: result
        }
    }

    private createInternalRequest(input: ChannelPredictionRequest): Request {
        const req = {
            params: {
                id: input.chatflowId
            },
            body: {
                question: input.question,
                chatId: input.session.chatId,
                sessionId: input.session.sessionId,
                overrideConfig: {
                    sessionId: input.session.sessionId,
                    ...input.metadata
                },
                history: [],
                streaming: false
            },
            headers: {},
            files: [],
            protocol: 'http',
            get: (_key: string) => undefined
        } as unknown as Request

        return req
    }
}

const extractTextFromPrediction = (result: unknown): string => {
    if (typeof result === 'string') return result

    if (result && typeof result === 'object') {
        const response = result as Record<string, unknown>

        if (typeof response.text === 'string') return response.text
        if (typeof response.answer === 'string') return response.answer
        if (typeof response.response === 'string') return response.response
    }

    return ''
}
