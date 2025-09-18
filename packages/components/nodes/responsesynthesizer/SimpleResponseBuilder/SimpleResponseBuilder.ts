import { INode, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ResponseSynthesizerClass } from '../base'

class SimpleResponseBuilder_LlamaIndex implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Simple Response Builder'
        this.name = 'simpleResponseBuilderLlamaIndex'
        this.version = 1.0
        this.type = 'SimpleResponseBuilder'
        this.icon = 'simplerb.svg'
        this.category = 'Response Synthesizer'
        this.description = `Apply a query to a collection of text chunks, gathering the responses in an array, and return a combined string of all responses. Useful for individual queries on each text chunk.`
        this.baseClasses = [this.type, 'ResponseSynthesizer']
        this.tags = ['LlamaIndex']
        this.inputs = []
    }

    async init(): Promise<any> {
        return new ResponseSynthesizerClass({ type: 'SimpleResponseBuilder' })
    }
}

module.exports = { nodeClass: SimpleResponseBuilder_LlamaIndex }
