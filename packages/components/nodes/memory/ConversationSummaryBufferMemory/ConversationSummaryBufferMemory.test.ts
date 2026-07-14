import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'

jest.mock('../../../src/Interface', () => {
    class FlowiseSummaryBufferMemory {
        llm: any
        maxTokenLimit: number
        movingSummaryBuffer = ''
        summaryChatMessageClass = SystemMessage
        humanPrefix = 'Human'
        aiPrefix = 'AI'

        constructor(fields: any) {
            this.llm = fields.llm
            this.maxTokenLimit = fields.maxTokenLimit
        }

        async predictNewSummary(_messages: BaseMessage[], _previousSummary: string): Promise<string> {
            return ''
        }
    }

    return { FlowiseSummaryBufferMemory }
})

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => []),
    mapChatMessageToBaseMessage: jest.fn(async (messages: Array<{ role?: string; type?: string; content?: string; message?: string }>) =>
        messages.map((message) => {
            const content = message.content ?? message.message ?? ''
            return message.role === 'userMessage' || message.type === 'userMessage' ? new HumanMessage(content) : new AIMessage(content)
        })
    )
}))

jest.mock(
    '../../chatmodels/ChatAnthropic/FlowiseChatAnthropic',
    () => ({
        ChatAnthropic: class ChatAnthropic {}
    }),
    { virtual: true }
)

const { nodeClass } = require('./ConversationSummaryBufferMemory')

interface ChatRow {
    id: string
    chatflowid: string
    sessionId: string
    role: 'userMessage' | 'apiMessage'
    content: string
    createdDate: Date
}

interface StoredState {
    stateKey: string
    chatflowid: string
    sessionId: string
    nodeId: string
    summary: string
    cursorCreatedDate: Date
    cursorMessageId: string
    version: number
}

const ChatMessageEntity = class ChatMessage {}
const ConversationSummaryBufferStateEntity = class ConversationSummaryBufferState {}

const messageId = (value: number): string => `00000000-0000-0000-0000-${value.toString().padStart(12, '0')}`

const row = (value: number, createdDate = new Date(`2026-01-01T00:00:0${value}.000Z`), overrides: Partial<ChatRow> = {}): ChatRow => ({
    id: messageId(value),
    chatflowid: 'flow-1',
    sessionId: 'session-1',
    role: value % 2 ? 'userMessage' : 'apiMessage',
    content: `raw-${value}`,
    createdDate,
    ...overrides
})

const createSharedDatabase = (initialRows: ChatRow[] = []) => {
    const rows = [...initialRows]
    const states = new Map<string, StoredState>()
    let conflict: ((stateKey: string) => void) | undefined

    const messageRepository = {
        find: jest.fn(async ({ where }: { where: { chatflowid: string; sessionId: string } | Array<Record<string, unknown>> }) => {
            const scope = Array.isArray(where) ? where[0] : where
            return rows
                .filter((message) => message.chatflowid === scope.chatflowid && message.sessionId === scope.sessionId)
                .sort((left, right) => {
                    const dateOrder = left.createdDate.getTime() - right.createdDate.getTime()
                    return dateOrder || left.id.localeCompare(right.id)
                })
        })
    }

    const stateRepository = {
        findOneBy: jest.fn(async ({ stateKey }: { stateKey: string }) => {
            const state = states.get(stateKey)
            return state ? { ...state } : null
        }),
        insert: jest.fn(async (state: StoredState) => {
            if (states.has(state.stateKey)) throw new Error('duplicate state')
            states.set(state.stateKey, { ...state })
        }),
        update: jest.fn(async ({ stateKey, version }: { stateKey: string; version: number }, values: Omit<StoredState, 'stateKey'>) => {
            if (conflict) {
                const trigger = conflict
                conflict = undefined
                trigger(stateKey)
                return { affected: 0 }
            }

            const state = states.get(stateKey)
            if (!state || state.version !== version) return { affected: 0 }
            states.set(stateKey, { stateKey, ...values })
            return { affected: 1 }
        }),
        delete: jest.fn(async ({ stateKey }: { stateKey: string }) => {
            states.delete(stateKey)
        })
    }

    const appDataSource = {
        getRepository: jest.fn((entity: unknown) => (entity === ChatMessageEntity ? messageRepository : stateRepository))
    }

    return {
        appDataSource,
        messageRepository,
        rows,
        states,
        forceNextUpdateConflict(handler: (stateKey: string) => void) {
            conflict = handler
        }
    }
}

const createMemory = async (
    database: ReturnType<typeof createSharedDatabase>,
    overrides: { chatflowid?: string; sessionId?: string; nodeId?: string; maxTokenLimit?: number } = {}
) => {
    const model = {
        getNumTokens: jest.fn(async (text: string) => text.match(/raw-\d+/g)?.length ?? 0)
    }
    const memory = await new nodeClass().init(
        {
            id: overrides.nodeId ?? 'node-1',
            inputs: {
                model,
                maxTokenLimit: String(overrides.maxTokenLimit ?? 2),
                sessionId: overrides.sessionId ?? 'session-1'
            }
        },
        '',
        {
            appDataSource: database.appDataSource,
            databaseEntities: {
                ChatMessage: ChatMessageEntity,
                ConversationSummaryBufferState: ConversationSummaryBufferStateEntity
            },
            chatflowid: overrides.chatflowid ?? 'flow-1',
            orgId: 'org-1'
        }
    )

    return { memory, model }
}

const messageContents = (messages: BaseMessage[]): string[] => messages.map((message) => message.content as string)
const summarizedValues = (messages: BaseMessage[]): string =>
    `digest(${messages.map((message) => (message.content as string).replace('raw-', '')).join(',')})`
const summarize = async (messages: BaseMessage[]): Promise<string> => summarizedValues(messages)
const mockSummarizer = (memory: any): jest.Mock<Promise<string>, [BaseMessage[], string]> => {
    const predict = jest.fn<Promise<string>, [BaseMessage[], string]>(summarize)
    memory.predictNewSummary = predict
    return predict
}

describe('ConversationSummaryBufferMemory persisted checkpoints', () => {
    it('restores a summary in a fresh instance and only summarizes messages after the cursor', async () => {
        const sameTimestamp = new Date('2026-01-01T00:00:00.000Z')
        const database = createSharedDatabase([row(1, sameTimestamp), row(2, sameTimestamp), row(3, sameTimestamp), row(4, sameTimestamp)])
        const first = await createMemory(database)
        const firstSummary = mockSummarizer(first.memory)

        expect(messageContents(await first.memory.getChatMessages('', true))).toEqual(['digest(1,2)', 'raw-3', 'raw-4'])
        expect(firstSummary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ content: 'raw-1' })]), '')
        expect([...database.states.values()][0]).toMatchObject({
            summary: 'digest(1,2)',
            cursorMessageId: messageId(2),
            version: 1
        })

        database.rows.push(row(5, sameTimestamp), row(6, sameTimestamp))
        const second = await createMemory(database)
        const secondSummary = mockSummarizer(second.memory)

        expect(messageContents(await second.memory.getChatMessages('', true))).toEqual(['digest(3,4)', 'raw-5', 'raw-6'])
        expect(secondSummary).toHaveBeenCalledTimes(1)
        expect(messageContents(secondSummary.mock.calls[0][0])).toEqual(['raw-3', 'raw-4'])
        expect(secondSummary.mock.calls[0][1]).toBe('digest(1,2)')
        expect([...database.states.values()][0]).toMatchObject({
            summary: 'digest(3,4)',
            cursorMessageId: messageId(4),
            version: 2
        })
        expect(database.messageRepository.find).toHaveBeenLastCalledWith(
            expect.objectContaining({
                where: [
                    expect.objectContaining({ createdDate: expect.objectContaining({ _type: 'moreThan' }) }),
                    expect.objectContaining({
                        createdDate: expect.objectContaining({ _type: 'equal' }),
                        id: expect.objectContaining({ _type: 'moreThan' })
                    })
                ],
                order: { createdDate: 'ASC', id: 'ASC' }
            })
        )
    })

    it('does not create a checkpoint when the history fits within the token limit', async () => {
        const database = createSharedDatabase([row(1), row(2)])
        const { memory } = await createMemory(database, { maxTokenLimit: 10 })
        const predict = jest.fn()
        memory.predictNewSummary = predict

        expect(messageContents(await memory.getChatMessages('', true))).toEqual(['raw-1', 'raw-2'])
        expect(predict).not.toHaveBeenCalled()
        expect(database.states.size).toBe(0)
    })

    it('uses prepend messages for the current context without advancing persisted state', async () => {
        const database = createSharedDatabase([row(1), row(2)])
        const { memory } = await createMemory(database, { maxTokenLimit: 1 })
        const predict = mockSummarizer(memory)

        await memory.getChatMessages('', true, [{ type: 'userMessage', message: 'raw-99' }])

        expect(messageContents(predict.mock.calls[0][0])).toEqual(['raw-99', 'raw-1'])
        expect(database.states.size).toBe(0)
    })

    it('keeps the checkpoint unchanged when summary generation fails', async () => {
        const database = createSharedDatabase([row(1), row(2)])
        const { memory } = await createMemory(database, { maxTokenLimit: 1 })
        memory.predictNewSummary = jest.fn().mockRejectedValue(new Error('summary failed'))

        await expect(memory.getChatMessages('', true)).rejects.toThrow('summary failed')
        expect(database.states.size).toBe(0)
    })

    it('reloads and recomputes after a CAS conflict without overwriting the newer summary', async () => {
        const database = createSharedDatabase([row(1), row(2), row(3), row(4)])
        const first = await createMemory(database, { maxTokenLimit: 1 })
        mockSummarizer(first.memory)
        await first.memory.getChatMessages('', true)

        database.rows.push(row(5))
        database.forceNextUpdateConflict((stateKey) => {
            const current = database.states.get(stateKey)!
            database.states.set(stateKey, {
                ...current,
                summary: 'competing-summary',
                cursorCreatedDate: row(4).createdDate,
                cursorMessageId: messageId(4),
                version: current.version + 1
            })
        })

        const second = await createMemory(database, { maxTokenLimit: 0 })
        const predict = mockSummarizer(second.memory)
        await second.memory.getChatMessages('', true)

        expect(predict).toHaveBeenCalledTimes(2)
        expect(predict.mock.calls[1][1]).toBe('competing-summary')
        expect([...database.states.values()][0]).toMatchObject({
            summary: 'digest(5)',
            cursorMessageId: messageId(5),
            version: 3
        })
    })

    it('isolates checkpoints by flow, session, and node and clears only its own state', async () => {
        const database = createSharedDatabase([
            row(1),
            row(2),
            row(3, undefined, { sessionId: 'session-2' }),
            row(4, undefined, { sessionId: 'session-2' }),
            row(5, undefined, { chatflowid: 'flow-2' }),
            row(6, undefined, { chatflowid: 'flow-2' })
        ])
        const configurations = [{}, { nodeId: 'node-2' }, { sessionId: 'session-2' }, { chatflowid: 'flow-2' }]
        const memories = []

        for (const configuration of configurations) {
            const created = await createMemory(database, { ...configuration, maxTokenLimit: 1 })
            mockSummarizer(created.memory)
            await created.memory.getChatMessages('', true)
            memories.push(created.memory)
        }

        expect(database.states.size).toBe(4)
        await memories[0].clearChatMessages()
        expect(database.states.size).toBe(3)
    })
})
