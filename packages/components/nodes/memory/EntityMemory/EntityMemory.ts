import { EntityMemoryInput } from 'langchain/dist/memory/entity_memory'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { BaseChatMemoryInput, BufferMemory, EntityMemory } from 'langchain/memory'
import { BaseLanguageModel } from 'langchain/base_language'

class EntityMemory_Memory implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Entity Memory'
        this.name = 'entityMemory'
        this.type = 'EntityMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Using an LLM to extracts information on entities and builds up its knowledge about that entity over time'
        this.baseClasses = [this.type, ...getBaseClasses(EntityMemory)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Chat History Key',
                name: 'chatHistoryKey',
                type: 'string',
                default: 'history'
            },
            {
                label: 'Entities Key',
                name: 'entitiesKey',
                type: 'string',
                default: 'entities'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const chatHistoryKey = nodeData.inputs?.chatHistoryKey as string
        const entitiesKey = nodeData.inputs?.entitiesKey as string

        const obj: EntityMemoryInput = {
            llm: model,
            returnMessages: true,
            chatHistoryKey,
            entitiesKey
        }

        return new EntityMemory(obj)
    }
}

module.exports = { nodeClass: EntityMemory_Memory }
