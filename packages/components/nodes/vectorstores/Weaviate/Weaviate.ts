import { flatten } from 'lodash'
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client'
import { WeaviateLibArgs, WeaviateStore } from '@langchain/weaviate'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, normalizeKeysRecursively, parseJsonBody } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { index } from '../../../src/indexing'
import { VectorStore } from '@langchain/core/vectorstores'

class Weaviate_VectorStores implements INode {
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
        this.label = 'Weaviate'
        this.name = 'weaviate'
        this.version = 4.0
        this.type = 'Weaviate'
        this.icon = 'weaviate.png'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity or mmr search using Weaviate, a scalable open-source vector database'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed when using Weaviate cloud hosted',
            optional: true,
            credentialNames: ['weaviateApi']
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
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Record Manager',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Keep track of the record to prevent duplication',
                optional: true
            },
            {
                label: 'Weaviate Scheme',
                name: 'weaviateScheme',
                type: 'options',
                default: 'https',
                options: [
                    {
                        label: 'https',
                        name: 'https'
                    },
                    {
                        label: 'http',
                        name: 'http'
                    }
                ]
            },
            {
                label: 'Weaviate Host',
                name: 'weaviateHost',
                type: 'string',
                placeholder: 'localhost:8080'
            },
            {
                label: 'Weaviate Index',
                name: 'weaviateIndex',
                type: 'string',
                placeholder: 'Test'
            },
            {
                label: 'Weaviate Text Key',
                name: 'weaviateTextKey',
                type: 'string',
                placeholder: 'text',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Weaviate Metadata Keys',
                name: 'weaviateMetadataKeys',
                type: 'string',
                rows: 4,
                placeholder: `["foo"]`,
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
            },
            {
                label: 'Weaviate Search Filter',
                name: 'weaviateFilter',
                type: 'json',
                additionalParams: true,
                optional: true,
                acceptVariable: true
            }
        ]
        addMMRInputParams(this.inputs)
        this.inputs.push({
            label: 'Alpha (for Hybrid Search)',
            name: 'alpha',
            description:
                'Number between 0 and 1 that determines the weighting of keyword (BM25) portion of the hybrid search. A value of 1 is a pure vector search, while 0 is a pure keyword search.',
            placeholder: '1',
            type: 'number',
            additionalParams: true,
            optional: true
        })
        this.outputs = [
            {
                label: 'Weaviate Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Weaviate Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(WeaviateStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const weaviateScheme = nodeData.inputs?.weaviateScheme as string
            const weaviateHost = nodeData.inputs?.weaviateHost as string
            const weaviateIndex = nodeData.inputs?.weaviateIndex as string
            const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
            const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

            const clientConfig: any = {
                scheme: weaviateScheme,
                host: weaviateHost
            }
            if (weaviateApiKey) clientConfig.apiKey = new ApiKey(weaviateApiKey)

            const client: WeaviateClient = weaviate.client(clientConfig)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const doc = { ...flattenDocs[i] }
                    if (doc.metadata) {
                        doc.metadata = normalizeKeysRecursively(doc.metadata)
                    }
                    finalDocs.push(new Document(doc))
                }
            }

            const obj: WeaviateLibArgs = {
                //@ts-ignore
                client,
                indexName: weaviateIndex
            }

            if (weaviateTextKey) obj.textKey = weaviateTextKey
            if (weaviateMetadataKeys) obj.metadataKeys = JSON.parse(weaviateMetadataKeys.replace(/\s/g, ''))

            try {
                if (recordManager) {
                    const vectorStore = (await WeaviateStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: weaviateTextKey ? weaviateIndex + '_' + weaviateTextKey : weaviateIndex
                        }
                    })
                    return res
                } else {
                    await WeaviateStore.fromDocuments(finalDocs, embeddings, obj)
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const weaviateScheme = nodeData.inputs?.weaviateScheme as string
            const weaviateHost = nodeData.inputs?.weaviateHost as string
            const weaviateIndex = nodeData.inputs?.weaviateIndex as string
            const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
            const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

            const clientConfig: any = {
                scheme: weaviateScheme,
                host: weaviateHost
            }
            if (weaviateApiKey) clientConfig.apiKey = new ApiKey(weaviateApiKey)

            const client: WeaviateClient = weaviate.client(clientConfig)

            const obj: WeaviateLibArgs = {
                //@ts-ignore
                client,
                indexName: weaviateIndex
            }

            if (weaviateTextKey) obj.textKey = weaviateTextKey
            if (weaviateMetadataKeys) obj.metadataKeys = JSON.parse(weaviateMetadataKeys.replace(/\s/g, ''))

            const weaviateStore = new WeaviateStore(embeddings, obj)

            try {
                if (recordManager) {
                    const vectorStoreName = weaviateTextKey ? weaviateIndex + '_' + weaviateTextKey : weaviateIndex
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const filterKeys: ICommonObject = {}
                    if (options.docId) {
                        filterKeys.docId = options.docId
                    }
                    const keys: string[] = await recordManager.listKeys(filterKeys)

                    await weaviateStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await weaviateStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const weaviateScheme = nodeData.inputs?.weaviateScheme as string
        const weaviateHost = nodeData.inputs?.weaviateHost as string
        const weaviateIndex = nodeData.inputs?.weaviateIndex as string
        const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
        const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        let weaviateFilter = nodeData.inputs?.weaviateFilter

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

        const clientConfig: any = {
            scheme: weaviateScheme,
            host: weaviateHost
        }
        if (weaviateApiKey) clientConfig.apiKey = new ApiKey(weaviateApiKey)

        const client: WeaviateClient = weaviate.client(clientConfig)

        const obj: WeaviateLibArgs = {
            //@ts-ignore
            client,
            indexName: weaviateIndex
        }

        if (weaviateTextKey) obj.textKey = weaviateTextKey
        if (weaviateMetadataKeys) obj.metadataKeys = JSON.parse(weaviateMetadataKeys.replace(/\s/g, ''))
        if (weaviateFilter) {
            weaviateFilter = typeof weaviateFilter === 'object' ? weaviateFilter : parseJsonBody(weaviateFilter)
        }

        const vectorStore = (await WeaviateStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore

        return resolveVectorStoreOrRetriever(nodeData, vectorStore, weaviateFilter)
    }
}

module.exports = { nodeClass: Weaviate_VectorStores }
