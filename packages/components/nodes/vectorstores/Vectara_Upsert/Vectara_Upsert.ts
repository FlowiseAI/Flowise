import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses } from '../../../src/utils'
import { VectaraStore, VectaraLibArgs, VectaraFilter } from 'langchain/vectorstores/vectara'
import { Document } from 'langchain/document'
import { flatten } from 'lodash'

class VectaraExisting_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Vectara Upsert Document'
        this.name = 'vectaraExisting'
        this.type = 'Vectara'
        this.icon = 'vectara.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Vectara'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Vectara Customer ID',
                name: 'customerID',
                type: 'string'
            },
            {
                label: 'Vectara Corpus ID',
                name: 'corpusID',
                type: 'string'
            },
            {
                label: 'Vectara API Key',
                name: 'apiKey',
                type: 'password'
            },
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Filter',
                name: 'filter',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Lambda',
                name: 'lambda',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Defaults to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Vectara Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Vectara Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(VectaraStore)]
            }
        ]
    }
    async init(nodeData: INodeData): Promise<any> {
        const customerId = nodeData.inputs?.customerID as number
        const corpusId = nodeData.inputs?.corpusID as number
        const apiKey = nodeData.inputs?.apiKey as string
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = {} as Embeddings
        const vectaraMetadatafilter = nodeData.inputs?.filter as VectaraFilter
        const lambda = nodeData.inputs?.lambda as number
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : 4

        const vectaraArgs: VectaraLibArgs = {
            apiKey: apiKey,
            customerId: customerId,
            corpusId: corpusId
        }

        const vectaraFilter: VectaraFilter = {}

        if (vectaraMetadatafilter) {
            const metadatafilter = typeof vectaraMetadatafilter === 'object' ? vectaraMetadatafilter : JSON.parse(vectaraMetadatafilter)
            vectaraFilter.filter = metadatafilter
        }

        if (lambda) vectaraFilter.lambda = lambda

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const vectorStore = await VectaraStore.fromDocuments(finalDocs, embeddings, vectaraArgs)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k, vectaraFilter)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: VectaraExisting_VectorStores }
