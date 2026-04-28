import { Mem0Memory as BaseMem0Memory, Mem0MemoryInput, ClientOptions } from '@mem0/community'
import { MemoryOptions, SearchOptions } from 'mem0ai'
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

interface NodeFields extends Mem0MemoryInput, Mem0MemoryExtendedInput, BufferMemoryExtendedInput {
    searchOnly: boolean
    useFlowiseChatId: boolean
    input: string
}

class Mem0_Memory implements INode {
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
        this.label = 'Mem0'
        this.name = 'mem0'
        this.version = 1.1
        this.type = 'Mem0'
        this.icon = 'mem0.svg'
        this.category = 'Memory'
        this.description = 'Stores and manages chat memory using Mem0 service'
        this.baseClasses = [this.type, ...getBaseClasses(BaseMem0Memory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: false,
            description: 'Configure API Key for Mem0 service',
            credentialNames: ['mem0MemoryApi']
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
                description: 'Use the Flowise internal Chat ID as the Mem0 User ID, overriding the "User ID" field above.',
                default: false,
                optional: true
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
                label: 'Run ID',
                name: 'run_id',
                type: 'string',
                description: 'Unique identifier for the run session',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Agent ID',
                name: 'agent_id',
                type: 'string',
                description: 'Identifier for the agent',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'App ID',
                name: 'app_id',
                type: 'string',
                description: 'Identifier for the application',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Project ID',
                name: 'project_id',
                type: 'string',
                description: 'Identifier for the project',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Organization ID',
                name: 'org_id',
                type: 'string',
                description: 'Identifier for the organization',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'history',
                optional: true,
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
        return await initializeMem0(nodeData, input, options)
    }
}

const initializeMem0 = async (nodeData: INodeData, input: string, options: ICommonObject): Promise<BaseMem0Memory> => {
    const initialUserId = nodeData.inputs?.user_id as string
    const useFlowiseChatId = nodeData.inputs?.useFlowiseChatId as boolean
    const orgId = options.orgId as string

    if (!useFlowiseChatId && !initialUserId) {
        throw new Error('User ID field cannot be empty when "Use Flowise Chat ID" is OFF.')
    }

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

    const mem0Options: ClientOptions = {
        apiKey: apiKey,
        host: nodeData.inputs?.host as string,
        organizationId: nodeData.inputs?.org_id as string,
        projectId: nodeData.inputs?.project_id as string
    }

    const memOptionsUserId = initialUserId

    const constructorSessionId = initialUserId || (useFlowiseChatId ? 'flowise-chat-id-placeholder' : '')

    const memoryOptions: MemoryOptions & SearchOptions = {
        user_id: memOptionsUserId,
        run_id: (nodeData.inputs?.run_id as string) || undefined,
        agent_id: (nodeData.inputs?.agent_id as string) || undefined,
        app_id: (nodeData.inputs?.app_id as string) || undefined,
        project_id: (nodeData.inputs?.project_id as string) || undefined,
        org_id: (nodeData.inputs?.org_id as string) || undefined,
        api_version: (nodeData.inputs?.api_version as string) || undefined,
        enable_graph: (nodeData.inputs?.enable_graph as boolean) || false,
        metadata: (nodeData.inputs?.metadata as Record<string, any>) || {},
        filters: (nodeData.inputs?.filters as Record<string, any>) || {}
    }

    const obj: NodeFields = {
        apiKey: apiKey,
        humanPrefix: nodeData.inputs?.humanPrefix as string,
        aiPrefix: nodeData.inputs?.aiPrefix as string,
        inputKey: nodeData.inputs?.inputKey as string,
        sessionId: constructorSessionId,
        mem0Options: mem0Options,
        memoryOptions: memoryOptions,
        separateMessages: false,
        returnMessages: false,
        appDataSource: options.appDataSource as DataSource,
        databaseEntities: options.databaseEntities as IDatabaseEntity,
        chatflowid: options.chatflowid as string,
        searchOnly: (nodeData.inputs?.searchOnly as boolean) || false,
        useFlowiseChatId: useFlowiseChatId,
        input: input,
        orgId: orgId
    }

    return new Mem0MemoryExtended(obj)
}

interface Mem0MemoryExtendedInput extends Mem0MemoryInput {
    memoryOptions?: MemoryOptions | SearchOptions
    useFlowiseChatId: boolean
    orgId: string
}

class Mem0MemoryExtended extends BaseMem0Memory implements MemoryMethods {
    initialUserId: string
    userId: string
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
        this.initialUserId = fields.memoryOptions?.user_id ?? ''
        this.userId = this.initialUserId
        this.memoryKey = 'history'
        this.inputKey = fields.inputKey ?? 'input'
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
        this.searchOnly = fields.searchOnly
        this.useFlowiseChatId = fields.useFlowiseChatId
        this.input = fields.input
        this.orgId = fields.orgId
    }

    // Selects Mem0 user_id based on toggle state (Flowise chat ID or input field)
    private getEffectiveUserId(overrideUserId?: string): string {
        let effectiveUserId: string | undefined

        if (this.useFlowiseChatId) {
            if (overrideUserId) {
                effectiveUserId = overrideUserId
            } else {
                throw new Error('Mem0: "Use Flowise Chat ID" is ON, but no runtime chat ID (overrideUserId) was provided.')
            }
        } else {
            // If toggle is OFF, ALWAYS use the ID from the input field.
            effectiveUserId = this.initialUserId
        }

        // This check is now primarily for the case where the toggle is OFF and the initialUserId was somehow empty (should be caught by init validation).
        if (!effectiveUserId) {
            throw new Error('Mem0: Could not determine a valid User ID for the operation. Check User ID input field.')
        }
        return effectiveUserId
    }

    async loadMemoryVariables(values: InputValues, overrideUserId = ''): Promise<MemoryVariables> {
        const effectiveUserId = this.getEffectiveUserId(overrideUserId)
        this.userId = effectiveUserId
        if (this.memoryOptions) {
            this.memoryOptions.user_id = effectiveUserId
        }
        return super.loadMemoryVariables(values)
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideUserId = ''): Promise<void> {
        if (this.searchOnly) {
            return
        }
        const effectiveUserId = this.getEffectiveUserId(overrideUserId)
        this.userId = effectiveUserId
        if (this.memoryOptions) {
            this.memoryOptions.user_id = effectiveUserId
        }
        return super.saveContext(inputValues, outputValues)
    }

    async clear(overrideUserId = ''): Promise<void> {
        const effectiveUserId = this.getEffectiveUserId(overrideUserId)
        this.userId = effectiveUserId
        if (this.memoryOptions) {
            this.memoryOptions.user_id = effectiveUserId
        }
        return super.clear()
    }

    async getChatMessages(
        overrideUserId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const flowiseSessionId = overrideUserId
        if (!flowiseSessionId) {
            console.warn('Mem0: getChatMessages called without overrideUserId (Flowise Session ID). Cannot fetch DB messages.')
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
            const memoryVariables = await this.loadMemoryVariables(
                {
                    [this.inputKey]: this.input ?? ''
                },
                overrideUserId
            )
            const mem0History = memoryVariables[this.memoryKey]

            if (mem0History && typeof mem0History === 'string') {
                const systemMessage = {
                    role: 'apiMessage' as MessageType,
                    content: mem0History,
                    id: uuidv4()
                }
                // Ensure Mem0 history message also conforms structurally if mapChatMessageToBaseMessage is strict
                chatMessage.unshift(systemMessage as any) // Cast needed if mixing structures
            } else if (mem0History) {
                console.warn('Mem0 history is not a string, cannot prepend directly.')
            }

            return await mapChatMessageToBaseMessage(chatMessage, this.orgId)
        }

        return returnIMessages
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideUserId = ''): Promise<void> {
        const effectiveUserId = this.getEffectiveUserId(overrideUserId)
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input && output) {
            const inputValues = { [this.inputKey ?? 'input']: input.text }
            const outputValues = { output: output.text }
            await this.saveContext(inputValues, outputValues, effectiveUserId)
        } else {
            console.warn('Mem0: Could not find both input and output messages to save context.')
        }
    }

    async clearChatMessages(overrideUserId = ''): Promise<void> {
        const effectiveUserId = this.getEffectiveUserId(overrideUserId)
        await this.clear(effectiveUserId)

        const flowiseSessionId = overrideUserId
        if (flowiseSessionId) {
            await this.appDataSource
                .getRepository(this.databaseEntities['ChatMessage'])
                .delete({ sessionId: flowiseSessionId, chatflowid: this.chatflowid })
        } else {
            console.warn('Mem0: clearChatMessages called without overrideUserId (Flowise Session ID). Cannot clear DB messages.')
        }
    }
}

module.exports = { nodeClass: Mem0_Memory }
