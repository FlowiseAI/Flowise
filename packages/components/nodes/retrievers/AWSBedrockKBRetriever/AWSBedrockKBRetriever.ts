import { AmazonKnowledgeBaseRetriever } from '@langchain/aws'
import { ICommonObject, INode, INodeData, INodeParams, INodeOptionsValue } from '../../../src/Interface'
import { getAWSCredentialConfig } from '../../../src/awsToolsUtils'
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime'
import { MODEL_TYPE, getRegions } from '../../../src/modelLoader'

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
        const credentialConfig = await getAWSCredentialConfig(nodeData, options, region)
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
