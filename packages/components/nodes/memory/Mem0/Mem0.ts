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
        this.version = 1.0
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
                description: 'Unique identifier for the user',
                default: 'flowise-default-user',
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return await initializeMem0(nodeData, options)
    }
}

const initializeMem0 = async (nodeData: INodeData, options: ICommonObject): Promise<BaseMem0Memory> => {
    const userId = nodeData.inputs?.user_id as string
    if (!userId) {
        throw new Error('user_id is required for Mem0Memory')
    }

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

    const mem0Options: ClientOptions = {
        apiKey: apiKey,
        host: nodeData.inputs?.host as string,
        organizationId: nodeData.inputs?.org_id as string,
        projectId: nodeData.inputs?.project_id as string
    }

    const memoryOptions: MemoryOptions & SearchOptions = {
        user_id: userId,
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

    const obj: Mem0MemoryInput & Mem0MemoryExtendedInput & BufferMemoryExtendedInput & { searchOnly: boolean } = {
        apiKey: apiKey,
        humanPrefix: nodeData.inputs?.humanPrefix as string,
        aiPrefix: nodeData.inputs?.aiPrefix as string,
        inputKey: nodeData.inputs?.inputKey as string,
        sessionId: nodeData.inputs?.user_id as string,
        mem0Options: mem0Options,
        memoryOptions: memoryOptions,
        separateMessages: false,
        returnMessages: false,
        appDataSource: options.appDataSource as DataSource,
        databaseEntities: options.databaseEntities as IDatabaseEntity,
        chatflowid: options.chatflowid as string,
        searchOnly: (nodeData.inputs?.searchOnly as boolean) || false
    }

    return new Mem0MemoryExtended(obj)
}

interface Mem0MemoryExtendedInput extends Mem0MemoryInput {
    memoryOptions?: MemoryOptions | SearchOptions
}

class Mem0MemoryExtended extends BaseMem0Memory implements MemoryMethods {
    userId: string
    memoryKey: string
    inputKey: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    searchOnly: boolean

    constructor(fields: Mem0MemoryInput & Mem0MemoryExtendedInput & BufferMemoryExtendedInput & { searchOnly: boolean }) {
        super(fields)
        this.userId = fields.memoryOptions?.user_id ?? ''
        this.memoryKey = 'history'
        this.inputKey = fields.inputKey ?? 'input'
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
        this.searchOnly = fields.searchOnly
    }

    async loadMemoryVariables(values: InputValues, overrideUserId = ''): Promise<MemoryVariables> {
        if (overrideUserId) {
            this.userId = overrideUserId
        }
        return super.loadMemoryVariables(values)
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideUserId = ''): Promise<void> {
        if (overrideUserId) {
            this.userId = overrideUserId
        }
        if (this.searchOnly) {
            return
        }
        return super.saveContext(inputValues, outputValues)
    }

    async clear(overrideUserId = ''): Promise<void> {
        if (overrideUserId) {
            this.userId = overrideUserId
        }
        return super.clear()
    }

    async getChatMessages(
        overrideUserId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideUserId ? overrideUserId : this.userId
        if (!id) return []

        let chatMessage = await this.appDataSource.getRepository(this.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: id,
                chatflowid: this.chatflowid
            },
            order: {
                createdDate: 'DESC'
            },
            take: 10
        })

        chatMessage = chatMessage.reverse()

        let returnIMessages: IMessage[] = []
        for (const m of chatMessage) {
            returnIMessages.push({
                message: m.content as string,
                type: m.role
            })
        }

        if (prependMessages?.length) {
            chatMessage.unshift(...prependMessages)
        }

        if (returnBaseMessages) {
            const memoryVariables = await this.loadMemoryVariables({}, id)
            let baseMessages = memoryVariables[this.memoryKey]

            const systemMessage = { ...chatMessage[0] }
            systemMessage.content = baseMessages
            systemMessage.id = uuidv4()
            systemMessage.role = 'apiMessage'

            chatMessage.unshift(systemMessage)
            return await mapChatMessageToBaseMessage(chatMessage)
        }

        return returnIMessages
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideUserId = ''): Promise<void> {
        const id = overrideUserId ? overrideUserId : this.userId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')
        const inputValues = { [this.inputKey ?? 'input']: input?.text }
        const outputValues = { output: output?.text }

        await this.saveContext(inputValues, outputValues, id)
    }

    async clearChatMessages(overrideUserId = ''): Promise<void> {
        const id = overrideUserId ? overrideUserId : this.userId
        await this.clear(id)
    }
}

module.exports = { nodeClass: Mem0_Memory }
