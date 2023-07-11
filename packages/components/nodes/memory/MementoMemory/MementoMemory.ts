import { SystemChatMessage } from 'langchain/schema'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MomentoChatMessageHistory } from 'langchain/stores/message/momento'
import { ICommonObject } from '../../../src'
import { CacheClient } from '@gomomento/sdk'

class MomentoMemory implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Momento Memory'
        this.name = 'MomentoMemory'
        this.type = 'MomentoMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in Momento server'
        this.baseClasses = [this.type, ...getBaseClasses(MomentoChatMessageHistory)]
        this.inputs = [
            {
                label: 'Cache Name',
                name: 'cacheName',
                type: 'string',
                default: 'langchain'
            },
            {
                label: 'Session TTL',
                name: 'sessionTtl',
                type: 'number',
                description: 'The time-to-live for the session in seconds',
                default: 300,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cacheName = nodeData.inputs?.cacheName as string
        const sessionTtl = nodeData.inputs?.sessionTtl as number

        const sessionId = options?.chatId as string
        const client = options?.client as CacheClient

        const chatHistory = await MomentoChatMessageHistory.fromProps({
            client,
            cacheName,
            sessionId,
            sessionTtl
        })

        return {
            chatHistory,
            loadMemoryVariables: async (values: any) => {
                const data = { ...values }

                if (chatHistory && chatHistory.getMessages && data[cacheName] && data[cacheName].length) {
                    const memory = await chatHistory.getMessages()
                    if (memory && memory.length) {
                        const summary = memory.map((msg: any) => msg.text).join('\n')
                        const systemMessage = new SystemChatMessage(`This is the summary of the following conversation:\n${summary}`)
                        data[cacheName].unshift(systemMessage)
                    }
                }
                return data
            }
        }
    }
}

module.exports = { nodeClass: MomentoMemory }
