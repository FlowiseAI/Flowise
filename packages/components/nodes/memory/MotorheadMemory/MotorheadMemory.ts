import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { MotorheadMemory, MotorheadMemoryInput } from 'langchain/memory'

class MotorMemory_Memory implements INode {
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
        this.label = 'Motorhead Memory'
        this.name = 'motorheadMemory'
        this.version = 1.0
        this.type = 'MotorheadMemory'
        this.icon = 'motorhead.png'
        this.category = 'Memory'
        this.description = 'Use Motorhead Memory to store chat conversations'
        this.baseClasses = [this.type, ...getBaseClasses(MotorheadMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'Only needed when using hosted solution - https://getmetal.io',
            credentialNames: ['motorheadMemoryApi']
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                optional: true,
                description: 'To use the online version, leave the URL blank. More details at https://getmetal.io.'
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
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initalizeMotorhead(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const motorhead = await initalizeMotorhead(nodeData, options)
        await motorhead.clear()
    }
}

const initalizeMotorhead = async (nodeData: INodeData, options: ICommonObject): Promise<MotorheadMemory> => {
    const memoryKey = nodeData.inputs?.memoryKey as string
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string

    const chatId = options?.chatId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
    const clientId = getCredentialParam('clientId', credentialData, nodeData)

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
