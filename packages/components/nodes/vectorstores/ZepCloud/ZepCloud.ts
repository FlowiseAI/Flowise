import { flatten } from 'lodash'
import { ZepClient } from '@getzep/zep-cloud'
import { IZepConfig, ZepVectorStore } from '@getzep/zep-cloud/langchain'
import { Document } from 'langchain/document'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { FakeEmbeddings } from 'langchain/embeddings/fake'
import { Embeddings } from '@langchain/core/embeddings'

class Zep_CloudVectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Zep Collection - Cloud'
        this.name = 'zepCloud'
        this.version = 2.0
        this.type = 'Zep'
        this.icon = 'zep.svg'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity or mmr search upon query using Zep, a fast and scalable building block for LLM apps'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: false,
            description: 'Configure JWT authentication on your Zep instance (Optional)',
            credentialNames: ['zepMemoryApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Zep Collection',
                name: 'zepCollection',
                type: 'string',
                placeholder: 'my-first-collection'
            },
            {
                label: 'Zep Metadata Filter',
                name: 'zepMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true,
                acceptVariable: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        addMMRInputParams(this.inputs)
        this.outputs = [
            {
                label: 'Zep Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Zep Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(ZepVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const zepCollection = nodeData.inputs?.zepCollection as string
            const docs = nodeData.inputs?.document as Document[]
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }
            const client = new ZepClient({
                apiKey: apiKey
            })
            const zepConfig = {
                apiKey: apiKey,
                collectionName: zepCollection,
                client
            }
            try {
                await ZepVectorStore.fromDocuments(finalDocs, new FakeEmbeddings(), zepConfig)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const zepCollection = nodeData.inputs?.zepCollection as string
        const zepMetadataFilter = nodeData.inputs?.zepMetadataFilter
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const zepConfig: IZepConfig & Partial<ZepFilter> = {
            apiKey,
            collectionName: zepCollection
        }
        if (zepMetadataFilter) {
            zepConfig.filter = typeof zepMetadataFilter === 'object' ? zepMetadataFilter : parseJsonBody(zepMetadataFilter)
        }
        zepConfig.client = new ZepClient({
            apiKey: apiKey
        })
        const vectorStore = await ZepExistingVS.init(zepConfig)
        return resolveVectorStoreOrRetriever(nodeData, vectorStore, zepConfig.filter)
    }
}

interface ZepFilter {
    filter: Record<string, any>
}

class ZepExistingVS extends ZepVectorStore {
    filter?: Record<string, any>
    args?: IZepConfig & Partial<ZepFilter>

    constructor(embeddings: Embeddings, args: IZepConfig & Partial<ZepFilter>) {
        super(embeddings, args)
        this.filter = args.filter
        this.args = args
    }

    static async fromExistingIndex(embeddings: Embeddings, dbConfig: IZepConfig & Partial<ZepFilter>): Promise<ZepVectorStore> {
        return new this(embeddings, dbConfig)
    }
}

module.exports = { nodeClass: Zep_CloudVectorStores }
