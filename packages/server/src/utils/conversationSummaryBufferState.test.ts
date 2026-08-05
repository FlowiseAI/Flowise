import { ConversationSummaryBufferState } from '../database/entities/ConversationSummaryBufferState'
import { invalidateConversationSummaryBufferStates } from './conversationSummaryBufferState'

describe('invalidateConversationSummaryBufferStates', () => {
    const deleteStates = jest.fn()
    const appDataSource = {
        getRepository: jest.fn(() => ({ delete: deleteStates }))
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('invalidates selected sessions when chat messages are deleted', async () => {
        await invalidateConversationSummaryBufferStates(appDataSource as never, 'flow-1', ['session-1', 'session-2'])

        expect(appDataSource.getRepository).toHaveBeenCalledWith(ConversationSummaryBufferState)
        expect(deleteStates).toHaveBeenCalledWith({
            chatflowid: 'flow-1',
            sessionId: { type: 'in', value: ['session-1', 'session-2'] }
        })
    })

    it('invalidates every state when a chatflow is deleted', async () => {
        await invalidateConversationSummaryBufferStates(appDataSource as never, 'flow-1')

        expect(deleteStates).toHaveBeenCalledWith({ chatflowid: 'flow-1' })
    })

    it('does not issue an unscoped delete for an empty session list', async () => {
        await invalidateConversationSummaryBufferStates(appDataSource as never, 'flow-1', [])

        expect(deleteStates).not.toHaveBeenCalled()
    })
})
