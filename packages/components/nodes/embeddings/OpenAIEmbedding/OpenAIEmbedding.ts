import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { OpenAIEmbeddings, OpenAIEmbeddingsParams } from 'langchain/embeddings/openai'

class OpenAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Embeddings'
        this.name = 'openAIEmbeddings'
        this.type = 'OpenAIEmbeddings'
        this.icon = 'openai.png'
        this.category = 'Embeddings'
        this.description = 'OpenAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.inputs = [
            {
                label: 'OpenAI Api Key',
                name: 'openAIApiKey',
                type: 'password'
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const openAIApiKey = nodeData.inputs?.openAIApiKey as string
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string } = {
            openAIApiKey
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: OpenAIEmbedding_Embeddings }
