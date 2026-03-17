import { flatten } from 'lodash'
import weaviate from 'weaviate-client'
import { WeaviateLibArgs, WeaviateStore } from '@langchain/weaviate'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, normalizeKeysRecursively, parseJsonBody } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { index } from '../../../src/indexing'
import { VectorStore } from '@langchain/core/vectorstores'

/**
 * Parses a host string into host and optional port.
 * Handles IPv6 bracket notation (e.g. "[::1]:8080") and plain "host:port".
 */
export function parseHostPort(host: string): { host: string; port?: number } {
    const ipv6Match = host.match(/^\[([^\]]+)\](?::(\d+))?$/)
    if (ipv6Match) {
        const port = ipv6Match[2] ? parseInt(ipv6Match[2], 10) : undefined
        return { host: ipv6Match[1], port: isNaN(port as number) ? undefined : port }
    }
    const lastColon = host.lastIndexOf(':')
    if (lastColon > 0) {
        const maybePart = host.substring(lastColon + 1)
        const port = parseInt(maybePart, 10)
        if (!isNaN(port) && String(port) === maybePart) {
            return { host: host.substring(0, lastColon), port }
        }
    }
    return { host }
}

async function createWeaviateClient(
    weaviateConnectionType: string,
    rawHost: string,
    httpSecure?: boolean,
    rawGrpcHost?: string,
    grpcSecure?: boolean,
    apiKey?: string
): Promise<Awaited<ReturnType<typeof weaviate.connectToCustom>>> {
    if (weaviateConnectionType === 'cloud') {
        if (!apiKey) {
            throw new Error('API key is required for cloud connection')
        }
        return weaviate.connectToWeaviateCloud(rawHost, {
            authCredentials: new weaviate.ApiKey(apiKey)
        })
    }

    const { host: extractedHttpHost, port: extractedHttpPort } = parseHostPort(rawHost)
    const { host: extractedGrpcHost, port: extractedGrpcPort } = parseHostPort(rawGrpcHost ?? '')

    if (weaviateConnectionType === 'local') {
        const options: Parameters<typeof weaviate.connectToLocal>[0] = {
            host: extractedHttpHost,
            port: extractedHttpPort,
            grpcPort: extractedGrpcPort,
            authCredentials: apiKey ? new weaviate.ApiKey(apiKey) : undefined
        }
        return weaviate.connectToLocal(options)
    }

    const httpHost = extractedHttpHost
    const httpPort = extractedHttpPort ?? 8080

    const grpcHost = extractedGrpcHost
    const grpcPort = extractedGrpcPort ?? 50051

    const options: Parameters<typeof weaviate.connectToCustom>[0] = {
        httpHost,
        httpPort,
        httpSecure,
        grpcHost,
        grpcPort,
        grpcSecure,
        authCredentials: apiKey ? new weaviate.ApiKey(apiKey) : undefined
    }

    return weaviate.connectToCustom(options)
}

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
        this.version = 5.0
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
                label: 'Weaviate Connection Type',
                name: 'weaviateConnectionType',
                type: 'options',
                options: [
                    {
                        label: 'Cloud',
                        name: 'cloud'
                    },
                    {
                        label: 'Local',
                        name: 'local'
                    },
                    {
                        label: 'Custom',
                        name: 'custom'
                    }
                ],
                default: 'cloud'
            },
            {
                label: 'Weaviate Host/URL',
                name: 'weaviateHost',
                type: 'string',
                placeholder: 'localhost:8080',
                description: 'The host/URL to connect to the Weaviate server. Use REST Endpoint for cloud connection.'
            },
            {
                label: 'HTTP Secure',
                name: 'weaviateHttpSecure',
                type: 'boolean',
                default: true,
                additionalParams: true,
                optional: true,
                show: {
                    weaviateConnectionType: 'custom'
                }
            },
            {
                label: 'GRPC Host/URL',
                name: 'weaviateGrpcHost',
                type: 'string',
                placeholder: 'localhost:50051',
                additionalParams: true,
                optional: true,
                show: {
                    weaviateConnectionType: 'custom'
                }
            },
            {
                label: 'GRPC Secure',
                name: 'weaviateGrpcSecure',
                type: 'boolean',
                default: true,
                additionalParams: true,
                optional: true,
                show: {
                    weaviateConnectionType: 'custom'
                }
            },
            {
                label: 'Weaviate Index',
                name: 'weaviateIndex',
                type: 'string',
                placeholder: 'Test',
                description: 'The collection name to use. Must start with capital letter.'
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
            const weaviateHost = nodeData.inputs?.weaviateHost as string
            const weaviateGrpcHost = nodeData.inputs?.weaviateGrpcHost as string
            const weaviateHttpSecure = nodeData.inputs?.weaviateHttpSecure as boolean
            const weaviateGrpcSecure = nodeData.inputs?.weaviateGrpcSecure as boolean
            const weaviateConnectionType = nodeData.inputs?.weaviateConnectionType as string
            const weaviateIndex = nodeData.inputs?.weaviateIndex as string
            const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
            const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

            const client = await createWeaviateClient(
                weaviateConnectionType,
                weaviateHost,
                weaviateHttpSecure,
                weaviateGrpcHost,
                weaviateGrpcSecure,
                weaviateApiKey
            )
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
            const weaviateHost = nodeData.inputs?.weaviateHost as string
            const weaviateGrpcHost = nodeData.inputs?.weaviateGrpcHost as string
            const weaviateHttpSecure = nodeData.inputs?.weaviateHttpSecure as boolean
            const weaviateGrpcSecure = nodeData.inputs?.weaviateGrpcSecure as boolean
            const weaviateConnectionType = nodeData.inputs?.weaviateConnectionType as string
            const weaviateIndex = nodeData.inputs?.weaviateIndex as string
            const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
            const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

            const client = await createWeaviateClient(
                weaviateConnectionType,
                weaviateHost,
                weaviateHttpSecure,
                weaviateGrpcHost,
                weaviateGrpcSecure,
                weaviateApiKey
            )

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
        const weaviateHost = nodeData.inputs?.weaviateHost as string
        const weaviateGrpcHost = nodeData.inputs?.weaviateGrpcHost as string
        const weaviateHttpSecure = nodeData.inputs?.weaviateHttpSecure as boolean
        const weaviateGrpcSecure = nodeData.inputs?.weaviateGrpcSecure as boolean
        const weaviateConnectionType = nodeData.inputs?.weaviateConnectionType as string
        const weaviateIndex = nodeData.inputs?.weaviateIndex as string
        const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
        const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        let weaviateFilter = nodeData.inputs?.weaviateFilter

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

        const client = await createWeaviateClient(
            weaviateConnectionType,
            weaviateHost,
            weaviateHttpSecure,
            weaviateGrpcHost,
            weaviateGrpcSecure,
            weaviateApiKey
        )

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
