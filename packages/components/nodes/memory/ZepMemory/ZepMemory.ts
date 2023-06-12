import { SystemChatMessage } from 'langchain/schema'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ZepMemory, ZepMemoryInput } from 'langchain/memory/zep'
import { ICommonObject } from '../../../src'

class ZepMemory_Memory implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Zep Memory'
        this.name = 'ZepMemory'
        this.type = 'ZepMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in zep server'
        this.baseClasses = [this.type, ...getBaseClasses(ZepMemory)]
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
                description: 'if empty, chatId will be used automatically',
                default: '',
                additionalParams: true
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
        const baseURL = nodeData.inputs?.baseURL as string
        const aiPrefix = nodeData.inputs?.aiPrefix as string
        const humanPrefix = nodeData.inputs?.humanPrefix as string
        const memoryKey = nodeData.inputs?.memoryKey as string
        const inputKey = nodeData.inputs?.inputKey as string
        const autoSummaryTemplate = nodeData.inputs?.autoSummaryTemplate as string
        const autoSummary = nodeData.inputs?.autoSummary as boolean
        const sessionId = nodeData.inputs?.sessionId as string

        const chatId = options?.chatId as string

        const obj: ZepMemoryInput = {
            baseURL,
            sessionId: sessionId ? sessionId : chatId,
            aiPrefix,
            humanPrefix,
            returnMessages: true,
            memoryKey,
            inputKey
        }

        let zep = new ZepMemory(obj)

        // hack to support summary
        let tmpFunc = zep.loadMemoryVariables
        zep.loadMemoryVariables = async (values) => {
            let data = await tmpFunc.bind(zep, values)()
            if (autoSummary && zep.returnMessages && data[zep.memoryKey] && data[zep.memoryKey].length) {
                const memory = await zep.zepClient.getMemory(zep.sessionId, 10)
                if (memory?.summary) {
                    let summary = autoSummaryTemplate.replace(/{summary}/g, memory.summary.content)
                    // eslint-disable-next-line no-console
                    console.log('[ZepMemory] auto summary:', summary)
                    data[zep.memoryKey].unshift(new SystemChatMessage(summary))
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
}

module.exports = { nodeClass: ZepMemory_Memory }
