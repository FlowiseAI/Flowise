import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Chroma, ChromaLibArgs } from 'langchain/vectorstores/chroma'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import type { Collection } from 'chromadb'

class Chroma_Existing_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Chroma Load Existing Index'
        this.name = 'chromaExistingIndex'
        this.version = 1.0
        this.type = 'Chroma'
        this.icon = 'chroma.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Chroma (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed if you have chroma on cloud services with X-Api-key',
            optional: true,
            credentialNames: ['chromaApi']
        }
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Collection Name',
                name: 'collectionName',
                type: 'string'
            },
            {
                label: 'Chroma URL',
                name: 'chromaURL',
                type: 'string',
                optional: true
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
        this.outputs = [
            {
                label: 'Chroma Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Chroma Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(Chroma)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const collectionName = nodeData.inputs?.collectionName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const chromaURL = nodeData.inputs?.chromaURL as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const chromaApiKey = getCredentialParam('chromaApiKey', credentialData, nodeData)

        const obj: {
            collectionName: string
            url?: string
            chromaApiKey?: string
        } = { collectionName }
        if (chromaURL) obj.url = chromaURL
        if (chromaApiKey) obj.chromaApiKey = chromaApiKey

        const vectorStore = await ChromaExisting.fromExistingCollection(embeddings, obj)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

interface ChromaAuth {
    chromaApiKey?: string
}

class ChromaExisting extends Chroma {
    chromaApiKey?: string

    constructor(embeddings: Embeddings, args: ChromaLibArgs & Partial<ChromaAuth>) {
        super(embeddings, args)
        this.chromaApiKey = args.chromaApiKey
    }

    static async fromExistingCollection(embeddings: Embeddings, dbConfig: ChromaLibArgs & Partial<ChromaAuth>): Promise<Chroma> {
        const instance = new this(embeddings, dbConfig)
        await instance.ensureCollection()
        return instance
    }

    async ensureCollection(): Promise<Collection> {
        if (!this.collection) {
            if (!this.index) {
                const { ChromaClient } = await Chroma.imports()
                const obj: any = {
                    path: this.url
                }
                if (this.chromaApiKey) {
                    obj.fetchOptions = {
                        headers: {
                            'X-Api-Key': this.chromaApiKey
                        }
                    }
                }
                this.index = new ChromaClient(obj)
            }
            try {
                this.collection = await this.index.getOrCreateCollection({
                    name: this.collectionName
                })
            } catch (err) {
                throw new Error(`Chroma getOrCreateCollection error: ${err}`)
            }
        }
        return this.collection
    }
}

module.exports = { nodeClass: Chroma_Existing_VectorStores }
