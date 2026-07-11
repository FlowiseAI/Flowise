import { AmazonKnowledgeBaseRetriever } from '@langchain/aws'
import { ICommonObject, INode, INodeData, INodeParams, INodeOptionsValue } from '../../../src/Interface'
import { getAWSCredentialConfig } from '../../../src/awsToolsUtils'
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime'
import { MODEL_TYPE, getRegions } from '../../../src/modelLoader'

function getSourceUri(result: any): string {
    if (result == null) return ''
    const location = result.location ?? {}
    if (location.s3Location) return location.s3Location.uri ?? ''
    if (location.webLocation) return location.webLocation.url ?? ''
    if (location.confluenceLocation) return location.confluenceLocation.url ?? ''
    if (location.salesforceLocation) return location.salesforceLocation.url ?? ''
    if (location.sharePointLocation) return location.sharePointLocation.url ?? ''
    if (location.customDocumentLocation) return location.customDocumentLocation.id ?? ''
    // Fallback for agentic results
    return result.metadata?._source_uri ?? ''
}

class AWSBedrockKBRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS Bedrock Knowledge Base Retriever'
        this.name = 'awsBedrockKBRetriever'
        this.version = 1.0
        this.type = 'AWSBedrockKBRetriever'
        this.icon = 'AWSBedrockKBRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Connect to AWS Bedrock Knowledge Base API and retrieve relevant chunks'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'AWS Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Region',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
            },
            {
                label: 'Knowledge Base ID',
                name: 'knoledgeBaseID',
                type: 'string'
            },
            {
                label: 'Query',
                name: 'query',
                type: 'string',
                description: 'Query to retrieve documents from retriever. If not specified, user question will be used',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'TopK',
                name: 'topK',
                type: 'number',
                description: 'Number of chunks to retrieve',
                optional: true,
                additionalParams: true,
                default: 5
            },
            {
                label: 'SearchType',
                name: 'searchType',
                type: 'options',
                description:
                    'Knowledge Base search type. Possible values are HYBRID and SEMANTIC. If not specified, default will be used. Consult AWS documentation for more',
                options: [
                    {
                        label: 'HYBRID',
                        name: 'HYBRID',
                        description: 'Hybrid seach type'
                    },
                    {
                        label: 'SEMANTIC',
                        name: 'SEMANTIC',
                        description: 'Semantic seach type'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: undefined
            },
            {
                label: 'Knowledge Base Type',
                name: 'knowledgeBaseType',
                type: 'options',
                description: 'Type of knowledge base. MANAGED (recommended) uses managed search. VECTOR uses traditional vector search.',
                options: [
                    {
                        label: 'MANAGED',
                        name: 'MANAGED',
                        description: 'Managed knowledge base - Bedrock handles embedding, storage, and retrieval automatically'
                    },
                    {
                        label: 'VECTOR',
                        name: 'VECTOR',
                        description: 'Traditional vector knowledge base with external vector store'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: 'VECTOR'
            },
            {
                label: 'Filter',
                name: 'filter',
                type: 'string',
                description: 'Knowledge Base retrieval filter. Read documentation for filter syntax',
                optional: true,
                additionalParams: true
            }
        ]
    }

    loadMethods = {
        // Reuse the AWS Bedrock Embeddings region list as it should be same for all Bedrock functions
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.EMBEDDING, 'AWSBedrockEmbeddings')
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const knoledgeBaseID = nodeData.inputs?.knoledgeBaseID as string
        const region = nodeData.inputs?.region as string
        const topK = nodeData.inputs?.topK as number
        const overrideSearchType = (nodeData.inputs?.searchType != '' ? nodeData.inputs?.searchType : undefined) as 'HYBRID' | 'SEMANTIC'
        const filter = (nodeData.inputs?.filter != '' ? JSON.parse(nodeData.inputs?.filter) : undefined) as RetrievalFilter
        const knowledgeBaseType = (nodeData.inputs?.knowledgeBaseType != '' ? nodeData.inputs?.knowledgeBaseType : undefined) as
            | 'MANAGED'
            | 'VECTOR'
            | undefined
        const credentialConfig = await getAWSCredentialConfig(nodeData, options, region)

        if (knowledgeBaseType === 'MANAGED') {
            // Try langchain retriever first (works once @langchain/aws supports managedSearchConfiguration).
            // If it fails with managed config error, fall back to direct Bedrock API call.
            const langchainRetriever = new AmazonKnowledgeBaseRetriever({
                topK,
                knowledgeBaseId: knoledgeBaseID,
                region,
                clientOptions: {
                    ...(credentialConfig.credentials && { credentials: credentialConfig.credentials })
                }
            })

            const { BedrockAgentRuntimeClient, RetrieveCommand, AgenticRetrieveStreamCommand } = await import('@aws-sdk/client-bedrock-agent-runtime')
            const { Document } = await import('@langchain/core/documents')
            const { BaseRetriever } = await import('@langchain/core/retrievers')
            const client = new BedrockAgentRuntimeClient({
                region,
                customUserAgent: [["flowise", "bedrock-kb"]],
                ...(credentialConfig.credentials && { credentials: credentialConfig.credentials })
            })

            // Create a proper BaseRetriever subclass for managed KB
            class ManagedKBRetriever extends BaseRetriever {
                lc_namespace = ['custom']

                async _getRelevantDocuments(query: string): Promise<any[]> {
                    // Try agentic retrieval first if enabled
                    const useAgenticRetrieval = process.env.USE_AGENTIC_RETRIEVAL !== 'false'
                    if (useAgenticRetrieval) {
                        try {
                            const agenticCmd = new AgenticRetrieveStreamCommand({
                                messages: [{ content: { text: query }, role: 'user' }],
                                retrievers: [{
                                    configuration: {
                                        knowledgeBase: {
                                            knowledgeBaseId: knoledgeBaseID,
                                            retrievalOverrides: { maxNumberOfResults: topK },
                                        },
                                    },
                                }],
                                agenticRetrieveConfiguration: {
                                    foundationModelType: 'MANAGED',
                                    rerankingModelType: 'MANAGED',
                                },
                            } as any)
                            const agenticResponse = await client.send(agenticCmd)
                            const results: any[] = []
                            const stream = (agenticResponse as any).stream
                            if (stream) {
                                for await (const event of stream) {
                                    if (event.result?.results) {
                                        for (const item of event.result.results) {
                                            results.push(new Document({
                                                pageContent: item.content?.text ?? '',
                                                metadata: {
                                                    source: getSourceUri(item),
                                                    score: item.score ?? 0
                                                }
                                            }))
                                        }
                                    }
                                }
                            }
                            if (results.length > 0) {
                                return results
                            }
                        } catch {
                            // Fall through to plain retrieve
                        }
                    }

                    try {
                        // Try langchain path (will work once @langchain/aws adds managed support)
                        return await langchainRetriever.getRelevantDocuments(query)
                    } catch (e: any) {
                        if (e?.message?.includes('managedSearchConfiguration') || e?.message?.includes('vectorSearchConfiguration is not supported')) {
                            // Fallback: direct API call with managedSearchConfiguration
                            const command = new RetrieveCommand({
                                knowledgeBaseId: knoledgeBaseID,
                                retrievalQuery: { text: query },
                                retrievalConfiguration: {
                                    managedSearchConfiguration: { numberOfResults: topK }
                                } as any
                            })
                            const response = await client.send(command)
                            return (response.retrievalResults ?? []).map((result: any) => new Document({
                                pageContent: result.content?.text ?? '',
                                metadata: {
                                    source: getSourceUri(result),
                                    score: result.score ?? 0
                                }
                            }))
                        }
                        throw e
                    }
                }
            }

            return new ManagedKBRetriever()
        }

        // For VECTOR KBs, use the langchain retriever (existing behavior)
        const retriever = new AmazonKnowledgeBaseRetriever({
            topK,
            knowledgeBaseId: knoledgeBaseID,
            region,
            filter,
            overrideSearchType,
            clientOptions: {
                ...(credentialConfig.credentials && { credentials: credentialConfig.credentials })
            }
        })

        return retriever
    }
}

module.exports = { nodeClass: AWSBedrockKBRetriever_Retrievers }
