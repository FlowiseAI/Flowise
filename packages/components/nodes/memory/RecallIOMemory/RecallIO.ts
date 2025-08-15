import { RecallioMemory as BaseRecallioMemory, RecallioMemoryInput } from 'recallio-community'
import { BaseMessage } from '@langchain/core/messages'
import { InputValues, MemoryVariables, OutputValues } from '@langchain/core/memory'
import { ICommonObject, IDatabaseEntity } from '../../../src'
import { IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, mapChatMessageToBaseMessage } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

interface BufferMemoryExtendedInput {
    sessionId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
}

interface NodeFields extends RecallioMemoryInput, RecallioMemoryExtendedInput, BufferMemoryExtendedInput {
    searchOnly: boolean
    useFlowiseChatId: boolean
    input: string
}

class RecallIO_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'RecallIO'
        this.name = 'recallio'
        this.version = 1.0
        this.type = 'RecallIO'
        this.icon = 'recallio.svg'
        this.category = 'Memory'
        this.description = 'Stores and manages chat memory using RecallIO service'
        this.baseClasses = [this.type, ...getBaseClasses(BaseRecallioMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: false,
            description: 'Configure API Key for RecallIO service',
            credentialNames: ['recallIOMemoryApi']
        }
        this.inputs = [
            {
                label: 'User ID',
                name: 'user_id',
                type: 'string',
                description: 'Unique identifier for the user. Required only if "Use Flowise Chat ID" is OFF.',
                default: 'flowise-default-user',
                optional: true
            },
            // Added toggle to use Flowise chat ID
            {
                label: 'Use Flowise Chat ID',
                name: 'useFlowiseChatId',
                type: 'boolean',
                description: 'Use the Flowise internal Chat ID as the RecallIO User ID, overriding the "User ID" field above.',
                default: false,
                optional: true
            },
            {
                label: 'Project ID',
                name: 'projectId',
                type: 'string',
                description: 'RecallIO Project ID',
                default: '',
                optional: false
            },
            {
                label: 'Search Only',
                name: 'searchOnly',
                type: 'boolean',
                description: 'Search only mode',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'string',
                description: 'Recall scope (e.g., user, app)',
                default: 'user',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tags (comma-separated)',
                name: 'tags',
                type: 'string',
                description: 'Optional tags to associate with memories, e.g. tag1, tag2',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Consent Flag',
                name: 'consentFlag',
                type: 'boolean',
                description: 'User consent to store memory',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Separate Messages',
                name: 'separateMessages',
                type: 'boolean',
                description: 'Return memory context as separate messages instead of a single system string',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'AI Prefix',
                name: 'aiPrefix',
                type: 'string',
                default: 'ai',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Human Prefix',
                name: 'humanPrefix',
                type: 'string',
                default: 'human',
                optional: true,
                additionalParams: true
            },
            // The following are kept for parity with similar nodes; not used directly by RecallIO
            { label: 'App ID', name: 'app_id', type: 'string', default: '', optional: true, additionalParams: true },
            { label: 'Organization ID', name: 'org_id', type: 'string', default: '', optional: true, additionalParams: true },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            },
            {
                label: 'Input Key',
                name: 'inputKey',
                type: 'string',
                default: 'input',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Output Key',
                name: 'outputKey',
                type: 'string',
                default: 'text',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        return await initializeRecallIO(nodeData, input, options)
    }
}

const parseTags = (raw?: string): string[] | undefined => {
    if (!raw) return undefined
    try {
        // allow JSON array input
        const maybeArr = JSON.parse(raw)
        if (Array.isArray(maybeArr)) return maybeArr.map((t) => String(t))
    } catch (_) {
        // fall through to comma-separated parsing
    }
    const parts = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    return parts.length ? parts : undefined
}

const initializeRecallIO = async (
    nodeData: INodeData,
    input: string,
    options: ICommonObject
): Promise<BaseRecallioMemory> => {
    const initialUserId = nodeData.inputs?.user_id as string
    const useFlowiseChatId = nodeData.inputs?.useFlowiseChatId as boolean
    const orgId = options.orgId as string

    if (!useFlowiseChatId && !initialUserId) {
        throw new Error('User ID field cannot be empty when "Use Flowise Chat ID" is OFF.')
    }

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

    const constructorSessionId = initialUserId || (useFlowiseChatId ? 'flowise-chat-id-placeholder' : '')

    const obj: NodeFields = {
        apiKey: apiKey,
        projectId: (nodeData.inputs?.projectId as string) || '',
        humanPrefix: (nodeData.inputs?.humanPrefix as string) || 'human',
        aiPrefix: (nodeData.inputs?.aiPrefix as string) || 'ai',
        inputKey: (nodeData.inputs?.inputKey as string) || 'input',
        outputKey: (nodeData.inputs?.outputKey as string) || 'text',
        memoryKey: (nodeData.inputs?.memoryKey as string) || 'chat_history',
        sessionId: constructorSessionId,
        scope: ((nodeData.inputs?.scope as string) || 'user') as string,
        tags: parseTags(nodeData.inputs?.tags as string),
        consentFlag: (nodeData.inputs?.consentFlag as boolean) ?? true,
        separateMessages: (nodeData.inputs?.separateMessages as boolean) ?? false,
        returnMessages: true,
        appDataSource: options.appDataSource as DataSource,
        databaseEntities: options.databaseEntities as IDatabaseEntity,
        chatflowid: options.chatflowid as string,
        searchOnly: (nodeData.inputs?.searchOnly as boolean) || false,
        useFlowiseChatId: useFlowiseChatId,
        input: input,
        orgId: orgId
    }

    if (!obj.projectId) throw new Error('Project ID cannot be empty')

    return new RecallioMemoryExtended(obj)
}

interface RecallioMemoryExtendedInput extends RecallioMemoryInput {
    useFlowiseChatId: boolean
    orgId: string
}

class RecallioMemoryExtended extends BaseRecallioMemory implements MemoryMethods {
    initialSessionId: string
    orgId: string
    memoryKey: string
    inputKey: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    searchOnly: boolean
    useFlowiseChatId: boolean
    input: string

    constructor(fields: NodeFields) {
        super(fields)
        this.initialSessionId = fields.sessionId ?? ''
        this.memoryKey = fields.memoryKey ?? 'chat_history'
        this.inputKey = fields.inputKey ?? 'input'
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
        this.searchOnly = fields.searchOnly
        this.useFlowiseChatId = fields.useFlowiseChatId
        this.input = fields.input
        this.orgId = fields.orgId
    }

    // Select sessionId based on toggle state (Flowise chat ID or input field)
    private getEffectiveSessionId(overrideSessionId?: string): string {
        let effectiveId: string | undefined

        if (this.useFlowiseChatId) {
            if (overrideSessionId) {
                effectiveId = overrideSessionId
            } else {
                throw new Error('RecallIO: "Use Flowise Chat ID" is ON, but no runtime chat ID (overrideUserId) was provided.')
            }
        } else {
            effectiveId = this.initialSessionId
        }

        if (!effectiveId) {
            throw new Error('RecallIO: Could not determine a valid Session/User ID for the operation. Check User ID input field.')
        }
        return effectiveId
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        const effectiveId = this.getEffectiveSessionId(overrideSessionId)
        this.sessionId = effectiveId
        const forwardedValues: InputValues = {
            ...values,
            input: (values as any)?.[this.inputKey] ?? (values as any)?.input ?? '*'
        }
        const result = await super.loadMemoryVariables(forwardedValues)
        if (!(this.memoryKey in result)) {
            // Guarantee presence of the expected memory key to satisfy downstream prompts
            ;(result as any)[this.memoryKey] = this.returnMessages ? [] : ''
        }
        return result
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideSessionId = ''): Promise<void> {
        if (this.searchOnly) return
        const effectiveId = this.getEffectiveSessionId(overrideSessionId)
        this.sessionId = effectiveId
        return super.saveContext(inputValues, outputValues)
    }

    async clear(overrideSessionId = ''): Promise<void> {
        const effectiveId = this.getEffectiveSessionId(overrideSessionId)
        this.sessionId = effectiveId
        return super.clear()
    }

    async getChatMessages(
        overrideUserId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const flowiseSessionId = overrideUserId
        if (!flowiseSessionId) {
            console.warn('RecallIO: getChatMessages called without overrideUserId (Flowise Session ID). Cannot fetch DB messages.')
            return []
        }

        let chatMessage = await this.appDataSource.getRepository(this.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: flowiseSessionId,
                chatflowid: this.chatflowid
            },
            order: {
                createdDate: 'DESC'
            },
            take: 10
        })
        chatMessage = chatMessage.reverse()

        let returnIMessages: IMessage[] = chatMessage.map((m) => ({
            message: m.content as string,
            type: m.role as MessageType
        }))

        if (prependMessages?.length) {
            returnIMessages.unshift(...prependMessages)
            // Reverted to original simpler unshift
            chatMessage.unshift(...(prependMessages as any))
        }

        if (returnBaseMessages) {
            const memoryVariables = await this.loadMemoryVariables({ input: this.input ?? '' }, overrideUserId)
            const recallHistory = memoryVariables[this.memoryKey]

            if (recallHistory && typeof recallHistory === 'string') {
                const systemMessage = {
                    role: 'apiMessage' as MessageType,
                    content: recallHistory,
                    id: uuidv4()
                }
                // Ensure RecallIO history message also conforms structurally if mapChatMessageToBaseMessage is strict
                chatMessage.unshift(systemMessage as any) // Cast needed if mixing structures
            } else if (recallHistory) {
                console.warn('RecallIO history is not a string, cannot prepend directly.')
            }

            return await mapChatMessageToBaseMessage(chatMessage, this.orgId)
        }

        return returnIMessages
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideUserId = ''): Promise<void> {
        const effectiveUserId = this.getEffectiveSessionId(overrideUserId)
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input && output) {
            const inputValues = { [this.inputKey ?? 'input']: input.text }
            const outputValues = { [this.outputKey ?? 'text']: output.text }
            await this.saveContext(inputValues, outputValues, effectiveUserId)
        } else {
            console.warn('RecallIO: Could not find both input and output messages to save context.')
        }
    }

    async clearChatMessages(overrideUserId = ''): Promise<void> {
        const effectiveUserId = this.getEffectiveSessionId(overrideUserId)
        await this.clear(effectiveUserId)

        const flowiseSessionId = overrideUserId
        if (flowiseSessionId) {
            await this.appDataSource
                .getRepository(this.databaseEntities['ChatMessage'])
                .delete({ sessionId: flowiseSessionId, chatflowid: this.chatflowid })
        } else {
            console.warn('RecallIO: clearChatMessages called without overrideUserId (Flowise Session ID). Cannot clear DB messages.')
        }
    }
}

module.exports = { nodeClass: RecallIO_Memory }
