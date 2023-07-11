import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { MotorheadMemory, MotorheadMemoryInput } from 'langchain/memory'

class MotorMemory_Memory implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Motorhead Memory'
        this.name = 'motorheadMemory'
        this.type = 'MotorheadMemory'
        this.icon = 'motorhead.png'
        this.category = 'Memory'
        this.description = 'Remembers previous conversational back and forths directly'
        this.baseClasses = [this.type, ...getBaseClasses(MotorheadMemory)]
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                optional: true,
                description: 'To use the online version, leave the URL blank. More details at https://getmetal.io.'
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history'
            },
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description: 'if empty, chatId will be used automatically',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'Only needed when using hosted solution - https://getmetal.io',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Client ID',
                name: 'clientId',
                type: 'string',
                description: 'Only needed when using hosted solution - https://getmetal.io',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initalizeMotorhead(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const motorhead = initalizeMotorhead(nodeData, options)
        motorhead.clear()
    }
}

const initalizeMotorhead = (nodeData: INodeData, options: ICommonObject): MotorheadMemory => {
    const memoryKey = nodeData.inputs?.memoryKey as string
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string
    const apiKey = nodeData.inputs?.apiKey as string
    const clientId = nodeData.inputs?.clientId as string

    const chatId = options?.chatId as string

    let obj: MotorheadMemoryInput = {
        returnMessages: true,
        sessionId: sessionId ? sessionId : chatId,
        memoryKey
    }

    if (baseURL) {
        obj = {
            ...obj,
            url: baseURL
        }
    } else {
        obj = {
            ...obj,
            apiKey,
            clientId
        }
    }

    return new MotorheadMemory(obj)
}

module.exports = { nodeClass: MotorMemory_Memory }
