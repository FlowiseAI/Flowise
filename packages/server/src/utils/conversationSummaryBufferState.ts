import { DataSource, In } from 'typeorm'
import { ConversationSummaryBufferState } from '../database/entities/ConversationSummaryBufferState'

export const invalidateConversationSummaryBufferStates = async (
    appDataSource: DataSource,
    chatflowid: string,
    sessionIds?: string[]
): Promise<void> => {
    if (sessionIds && !sessionIds.length) return

    await appDataSource.getRepository(ConversationSummaryBufferState).delete({
        chatflowid,
        ...(sessionIds ? { sessionId: In(sessionIds) } : {})
    })
}
