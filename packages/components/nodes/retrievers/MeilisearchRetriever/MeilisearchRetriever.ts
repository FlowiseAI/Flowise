import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { docsearch } from 'meilisearch-docsearch'
import { Meilisearch } from 'meilisearch'
import { MeilisearchRetriever } from './Meilisearch'

class MeilisearchRetriever_node implements INode {
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
    badge: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Meilisearch retriever'
        this.name = 'Meilisearch retriever'
        this.version = 1.0
        this.type = 'Meilisearch'
        this.icon = 'Meilisearch.png'
        this.category = 'Retrievers'
        this.badge = 'NEW'
        this.description = 'Meilisearch uses hybrid search to sematically answer the query.'
        this.baseClasses = ['BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: [this.type, 'MeilisearchApi']
        }
        this.inputs = [
            {
                label: 'host',
                name: 'host',
                type: 'string',
                description: 'This is the URL for the desired Meilisearch instance'
            },
            {
                label: 'indexUid',
                name: 'indexUid',
                type: 'string',
                description: 'UID for the index to answer from'
            },
            {
                label: 'Top K',
                name: 'K',
                type: 'number',
                description: 'number of top searches to return as context',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Meilisearch Retriever',
                name: 'meilisearch retriever',
                description: 'retrieve answers',
                baseClasses: this.baseClasses
            },
            {
                label: 'another output',
                name: 'meilisearch documents',
                description: 'return documents containing pageContent and metadata',
                baseClasses: ['Document', 'json']
            }
        ]
    }

    async upsert(nodeData: INodeData, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const meilisearchApiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const host = nodeData.inputs?.host as string
        const indexUid = nodeData.inputs?.indexUid as string
        const K = nodeData.inputs?.K as string
        const output = nodeData.outputs?.output as string
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const meilisearchApiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const host = nodeData.inputs?.host as string
        const indexUid = nodeData.inputs?.indexUid as string
        const K = nodeData.inputs?.K as string
        const output = nodeData.outputs?.output as string

        const hybridsearchretriever = new MeilisearchRetriever(host, meilisearchApiKey, indexUid, K)
        return hybridsearchretriever
    }
}
module.exports = { nodeClass: MeilisearchRetriever_node }
