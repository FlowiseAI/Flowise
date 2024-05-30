import { flatten } from 'lodash'
import { IDocument, ZepClient } from '@getzep/zep-cloud'
import { IZepConfig, ZepVectorStore } from '@getzep/zep-cloud/langchain'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { FakeEmbeddings } from 'langchain/embeddings/fake'

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
        this.badge = 'NEW'
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
                additionalParams: true
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
            const client = await ZepClient.init(apiKey)
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
            zepConfig.filter = typeof zepMetadataFilter === 'object' ? zepMetadataFilter : JSON.parse(zepMetadataFilter)
        }
        zepConfig.client = await ZepClient.init(zepConfig.apiKey)
        const vectorStore = await ZepExistingVS.init(zepConfig)
        return resolveVectorStoreOrRetriever(nodeData, vectorStore, zepConfig.filter)
    }
}

interface ZepFilter {
    filter: Record<string, any>
}

function zepDocsToDocumentsAndScore(results: IDocument[]): [Document, number][] {
    return results.map((d) => [
        new Document({
            pageContent: d.content,
            metadata: d.metadata
        }),
        d.score ? d.score : 0
    ])
}

function assignMetadata(value: string | Record<string, unknown> | object | undefined): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null) {
        return value as Record<string, unknown>
    }
    if (value !== undefined) {
        console.warn('Metadata filters must be an object, Record, or undefined.')
    }
    return undefined
}

class ZepExistingVS extends ZepVectorStore {
    filter?: Record<string, any>
    args?: IZepConfig & Partial<ZepFilter>

    constructor(embeddings: Embeddings, args: IZepConfig & Partial<ZepFilter>) {
        super(embeddings, args)
        this.filter = args.filter
        this.args = args
    }

    async initializeCollection(args: IZepConfig & Partial<ZepFilter>) {
        this.client = await ZepClient.init(args.apiKey, args.apiUrl)
        try {
            this.collection = await this.client.document.getCollection(args.collectionName)
        } catch (err) {
            if (err instanceof Error) {
                if (err.name === 'NotFoundError') {
                    await this.createNewCollection(args)
                } else {
                    throw err
                }
            }
        }
    }

    async createNewCollection(args: IZepConfig & Partial<ZepFilter>) {
        this.collection = await this.client.document.addCollection({
            name: args.collectionName,
            description: args.description,
            metadata: args.metadata
        })
    }

    async similaritySearchVectorWithScore(
        query: number[],
        k: number,
        filter?: Record<string, unknown> | undefined
    ): Promise<[Document, number][]> {
        if (filter && this.filter) {
            throw new Error('cannot provide both `filter` and `this.filter`')
        }
        const _filters = filter ?? this.filter
        const ANDFilters = []
        for (const filterKey in _filters) {
            let filterVal = _filters[filterKey]
            if (typeof filterVal === 'string') filterVal = `"${filterVal}"`
            ANDFilters.push({ jsonpath: `$[*] ? (@.${filterKey} == ${filterVal})` })
        }
        const newfilter = {
            where: { and: ANDFilters }
        }
        await this.initializeCollection(this.args!).catch((err) => {
            console.error('Error initializing collection:', err)
            throw err
        })
        const results = await this.collection.search(
            {
                embedding: new Float32Array(query),
                metadata: assignMetadata(newfilter)
            },
            k
        )
        return zepDocsToDocumentsAndScore(results)
    }

    static async fromExistingIndex(embeddings: Embeddings, dbConfig: IZepConfig & Partial<ZepFilter>): Promise<ZepVectorStore> {
        return new this(embeddings, dbConfig)
    }
}

module.exports = { nodeClass: Zep_CloudVectorStores }
