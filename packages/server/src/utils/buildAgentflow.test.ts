import { findChatMessageActionToClear } from './buildAgentflow'
import { ChatMessage } from '../database/entities/ChatMessage'

const makeMessage = (id: string, action: object | null): ChatMessage => {
    const message = new ChatMessage()
    message.id = id
    message.action = action ? JSON.stringify(action) : null
    return message
}

describe('findChatMessageActionToClear', () => {
    it('returns the message whose action.data.nodeId matches the resumed startNodeId', () => {
        const messages = [
            makeMessage('msg-3', { data: { nodeId: 'humanInput_2' } }),
            makeMessage('msg-2', { data: { nodeId: 'humanInput_1' } }),
            makeMessage('msg-1', null)
        ]

        const result = findChatMessageActionToClear(messages, 'humanInput_1')

        expect(result?.id).toBe('msg-2')
    })

    it('does not clear a different pending Human-In-The-Loop node just because it is newer (#4787)', () => {
        // Two HIL nodes are pending at the same time. Resuming humanInput_1 must not touch
        // the chat message that belongs to humanInput_2, even though it was created more recently.
        const newerUnrelatedAction = makeMessage('msg-newer', { data: { nodeId: 'humanInput_2' } })
        const olderTargetAction = makeMessage('msg-older', { data: { nodeId: 'humanInput_1' } })
        const messages = [newerUnrelatedAction, olderTargetAction]

        const result = findChatMessageActionToClear(messages, 'humanInput_1')

        expect(result?.id).toBe('msg-older')
        expect(result?.id).not.toBe(newerUnrelatedAction.id)
    })

    it('returns undefined when no message matches the startNodeId', () => {
        const messages = [makeMessage('msg-1', { data: { nodeId: 'humanInput_2' } })]

        const result = findChatMessageActionToClear(messages, 'humanInput_1')

        expect(result).toBeUndefined()
    })

    it('returns undefined when startNodeId is not provided', () => {
        const messages = [makeMessage('msg-1', { data: { nodeId: 'humanInput_1' } })]

        const result = findChatMessageActionToClear(messages, undefined)

        expect(result).toBeUndefined()
    })

    it('skips messages with malformed action JSON instead of throwing', () => {
        const malformed = new ChatMessage()
        malformed.id = 'msg-malformed'
        malformed.action = '{not valid json'

        const valid = makeMessage('msg-valid', { data: { nodeId: 'humanInput_1' } })

        const result = findChatMessageActionToClear([malformed, valid], 'humanInput_1')

        expect(result?.id).toBe('msg-valid')
    })

    it('skips messages with no action set', () => {
        const messages = [makeMessage('msg-1', null), makeMessage('msg-2', { data: { nodeId: 'humanInput_1' } })]

        const result = findChatMessageActionToClear(messages, 'humanInput_1')

        expect(result?.id).toBe('msg-2')
    })
})
