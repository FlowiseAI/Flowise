import { SystemMessage } from 'langchain/schema'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ZepMemory, ZepMemoryInput } from 'langchain/memory/zep'
import { ICommonObject } from '../../../src'

class ZepMemory_Memory implements INode {
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
        this.label = 'Zep Memory'
        this.name = 'ZepMemory'
        this.version = 1.0
        this.type = 'ZepMemory'
        this.icon = 'zep.png'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in zep server'
        this.baseClasses = [this.type, ...getBaseClasses(ZepMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'Configure JWT authentication on your Zep instance (Optional)',
            credentialNames: ['zepMemoryApi']
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                default: 'http://127.0.0.1:8000'
            },
            {
                label: 'Auto Summary',
                name: 'autoSummary',
                type: 'boolean',
                default: true
            },
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description: 'If not specified, the first CHAT_MESSAGE_ID will be used as sessionId',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Size',
                name: 'k',
                type: 'number',
                default: '10',
                description: 'Window of size k to surface the last k back-and-forths to use as memory.'
            },
            {
                label: 'Auto Summary Template',
                name: 'autoSummaryTemplate',
                type: 'string',
                default: 'This is the summary of the following conversation:\n{summary}',
                additionalParams: true
            },
            {
                label: 'AI Prefix',
                name: 'aiPrefix',
                type: 'string',
                default: 'ai',
                additionalParams: true
            },
            {
                label: 'Human Prefix',
                name: 'humanPrefix',
                type: 'string',
                default: 'human',
                additionalParams: true
            },
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
                additionalParams: true
            },
            {
                label: 'Output Key',
                name: 'outputKey',
                type: 'string',
                default: 'text',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const autoSummaryTemplate = nodeData.inputs?.autoSummaryTemplate as string
        const autoSummary = nodeData.inputs?.autoSummary as boolean

        const k = nodeData.inputs?.k as string

        let zep = await initalizeZep(nodeData, options)

        // hack to support summary
        let tmpFunc = zep.loadMemoryVariables
        zep.loadMemoryVariables = async (values) => {
            let data = await tmpFunc.bind(zep, values)()
            if (autoSummary && zep.returnMessages && data[zep.memoryKey] && data[zep.memoryKey].length) {
                const zepClient = await zep.zepClientPromise
                const memory = await zepClient.memory.getMemory(zep.sessionId, parseInt(k, 10) ?? 10)
                if (memory?.summary) {
                    let summary = autoSummaryTemplate.replace(/{summary}/g, memory.summary.content)
                    // eslint-disable-next-line no-console
                    console.log('[ZepMemory] auto summary:', summary)
                    data[zep.memoryKey].unshift(new SystemMessage(summary))
                }
            }
            // for langchain zep memory compatibility, or we will get "Missing value for input variable chat_history"
            if (data instanceof Array) {
                data = {
                    [zep.memoryKey]: data
                }
            }
            return data
        }
        return zep
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const zep = await initalizeZep(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing Zep memory session ${sessionId ? sessionId : chatId}`)
        await zep.clear()
        options.logger.info(`Successfully cleared Zep memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initalizeZep = async (nodeData: INodeData, options: ICommonObject): Promise<ZepMemory> => {
    const baseURL = nodeData.inputs?.baseURL as string
    const aiPrefix = nodeData.inputs?.aiPrefix as string
    const humanPrefix = nodeData.inputs?.humanPrefix as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const inputKey = nodeData.inputs?.inputKey as string
    const sessionId = nodeData.inputs?.sessionId as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

    const obj: ZepMemoryInput & Partial<ZepMemoryExtendedInput> = {
        baseURL,
        sessionId: sessionId ? sessionId : chatId,
        aiPrefix,
        humanPrefix,
        returnMessages: true,
        memoryKey,
        inputKey
    }
    if (apiKey) obj.apiKey = apiKey
    if (isSessionIdUsingChatMessageId) obj.isSessionIdUsingChatMessageId = true

    return new ZepMemoryExtended(obj)
}

interface ZepMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
}

class ZepMemoryExtended extends ZepMemory {
    isSessionIdUsingChatMessageId? = false

    constructor(fields: ZepMemoryInput & Partial<ZepMemoryExtendedInput>) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
    }
}

module.exports = { nodeClass: ZepMemory_Memory }
