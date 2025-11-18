import { flatten } from 'lodash'
import { AmazonKendraRetriever } from '@langchain/aws'
import { KendraClient, BatchPutDocumentCommand, BatchDeleteDocumentCommand } from '@aws-sdk/client-kendra'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { FLOWISE_CHATID, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { howToUseFileUpload } from '../VectorStoreUtils'
import { MODEL_TYPE, getRegions } from '../../../src/modelLoader'

class Kendra_VectorStores implements INode {
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
        this.label = 'AWS Kendra'
        this.name = 'kendra'
        this.version = 1.0
        this.type = 'Kendra'
        this.icon = 'kendra.svg'
        this.category = 'Vector Stores'
        this.description = `Use AWS Kendra's intelligent search service for document retrieval and semantic search`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'AWS Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
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
                label: 'Region',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
            },
            {
                label: 'Kendra Index ID',
                name: 'indexId',
                type: 'string',
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                description: 'The ID of your AWS Kendra index'
            },
            {
                label: 'File Upload',
                name: 'fileUpload',
                description: 'Allow file upload on the chat',
                hint: {
                    label: 'How to use',
                    value: howToUseFileUpload
                },
                type: 'boolean',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 10',
                placeholder: '10',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Attribute Filter',
                name: 'attributeFilter',
                description: 'Optional filter to apply when retrieving documents',
                type: 'json',
                optional: true,
                additionalParams: true,
                acceptVariable: true
            }
        ]
        // Note: Kendra doesn't support MMR search, but keeping the structure consistent
        this.outputs = [
            {
                label: 'Kendra Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Kendra Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, 'BaseRetriever']
            }
        ]
    }

    loadMethods = {
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.CHAT, 'awsChatBedrock')
        }
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const indexId = nodeData.inputs?.indexId as string
            const region = nodeData.inputs?.region as string
            const docs = nodeData.inputs?.document as Document[]
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            let clientConfig: any = { region }

            if (credentialData && Object.keys(credentialData).length !== 0) {
                const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
                const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)
                const sessionToken = getCredentialParam('awsSession', credentialData, nodeData)

                if (accessKeyId && secretAccessKey) {
                    clientConfig.credentials = {
                        accessKeyId,
                        secretAccessKey,
                        ...(sessionToken && { sessionToken })
                    }
                }
            }

            const client = new KendraClient(clientConfig)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            const kendraDocuments = []

            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    if (isFileUploadEnabled && options.chatId) {
                        flattenDocs[i].metadata = { ...flattenDocs[i].metadata, [FLOWISE_CHATID]: options.chatId }
                    }
                    finalDocs.push(new Document(flattenDocs[i]))

                    // Prepare document for Kendra
                    const docId = `doc_${Date.now()}_${i}`
                    const docTitle = flattenDocs[i].metadata?.title || flattenDocs[i].metadata?.source || `Document ${i + 1}`

                    kendraDocuments.push({
                        Id: docId,
                        Title: docTitle,
                        Blob: new Uint8Array(Buffer.from(flattenDocs[i].pageContent, 'utf-8')),
                        ContentType: 'PLAIN_TEXT' as any
                    })
                }
            }

            try {
                if (kendraDocuments.length > 0) {
                    // Kendra has a limit of 10 documents per batch
                    const batchSize = 10
                    for (let i = 0; i < kendraDocuments.length; i += batchSize) {
                        const batch = kendraDocuments.slice(i, i + batchSize)
                        const command = new BatchPutDocumentCommand({
                            IndexId: indexId,
                            Documents: batch
                        })

                        const response = await client.send(command)

                        if (response.FailedDocuments && response.FailedDocuments.length > 0) {
                            console.error('Failed documents:', response.FailedDocuments)
                            throw new Error(`Failed to index some documents: ${JSON.stringify(response.FailedDocuments)}`)
                        }
                    }
                }

                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (error) {
                throw new Error(`Failed to index documents to Kendra: ${error}`)
            }
        },

        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const indexId = nodeData.inputs?.indexId as string
            const region = nodeData.inputs?.region as string

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            let clientConfig: any = { region }

            if (credentialData && Object.keys(credentialData).length !== 0) {
                const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
                const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)
                const sessionToken = getCredentialParam('awsSession', credentialData, nodeData)

                if (accessKeyId && secretAccessKey) {
                    clientConfig.credentials = {
                        accessKeyId,
                        secretAccessKey,
                        ...(sessionToken && { sessionToken })
                    }
                }
            }

            const client = new KendraClient(clientConfig)

            try {
                // Kendra has a limit of 10 documents per batch delete
                const batchSize = 10
                for (let i = 0; i < ids.length; i += batchSize) {
                    const batch = ids.slice(i, i + batchSize)
                    const command = new BatchDeleteDocumentCommand({
                        IndexId: indexId,
                        DocumentIdList: batch
                    })
                    await client.send(command)
                }
            } catch (error) {
                throw new Error(`Failed to delete documents from Kendra: ${error}`)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const indexId = nodeData.inputs?.indexId as string
        const region = nodeData.inputs?.region as string
        const topK = nodeData.inputs?.topK as string
        const attributeFilter = nodeData.inputs?.attributeFilter
        const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        let clientOptions: any = {}

        if (credentialData && Object.keys(credentialData).length !== 0) {
            clientOptions.credentials = {
                accessKeyId: getCredentialParam('awsKey', credentialData, nodeData),
                secretAccessKey: getCredentialParam('awsSecret', credentialData, nodeData),
                sessionToken: getCredentialParam('awsSession', credentialData, nodeData)
            }
        }

        let filter = undefined
        if (attributeFilter) {
            filter = typeof attributeFilter === 'object' ? attributeFilter : parseJsonBody(attributeFilter)
        }

        // Add chat-specific filtering if file upload is enabled
        if (isFileUploadEnabled && options.chatId) {
            if (!filter) {
                filter = {}
            }
            filter.OrAllFilters = [
                ...(filter.OrAllFilters || []),
                {
                    EqualsTo: {
                        Key: FLOWISE_CHATID,
                        Value: {
                            StringValue: options.chatId
                        }
                    }
                }
            ]
        }

        const retriever = new AmazonKendraRetriever({
            topK: topK ? parseInt(topK) : 10,
            indexId,
            region,
            attributeFilter: filter,
            clientOptions
        })

        const output = nodeData.outputs?.output as string

        if (output === 'retriever') {
            return retriever
        } else if (output === 'vectorStore') {
            // Kendra doesn't have a traditional vector store interface,
            // but we can return the retriever with additional properties
            ;(retriever as any).k = topK ? parseInt(topK) : 10
            ;(retriever as any).filter = filter
            return retriever
        }
    }
}

module.exports = { nodeClass: Kendra_VectorStores }
