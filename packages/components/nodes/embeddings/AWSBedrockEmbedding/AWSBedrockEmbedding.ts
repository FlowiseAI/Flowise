import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { BedrockEmbeddings, BedrockEmbeddingsParams } from '@langchain/community/embeddings/bedrock'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class AWSBedrockEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS Bedrock Embeddings'
        this.name = 'AWSBedrockEmbeddings'
        this.version = 3.0
        this.type = 'AWSBedrockEmbeddings'
        this.icon = 'aws.svg'
        this.category = 'Embeddings'
        this.description = 'AWSBedrock embedding models to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(BedrockEmbeddings)]
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
                type: 'options',
                options: [
                    { label: 'af-south-1', name: 'af-south-1' },
                    { label: 'ap-east-1', name: 'ap-east-1' },
                    { label: 'ap-northeast-1', name: 'ap-northeast-1' },
                    { label: 'ap-northeast-2', name: 'ap-northeast-2' },
                    { label: 'ap-northeast-3', name: 'ap-northeast-3' },
                    { label: 'ap-south-1', name: 'ap-south-1' },
                    { label: 'ap-south-2', name: 'ap-south-2' },
                    { label: 'ap-southeast-1', name: 'ap-southeast-1' },
                    { label: 'ap-southeast-2', name: 'ap-southeast-2' },
                    { label: 'ap-southeast-3', name: 'ap-southeast-3' },
                    { label: 'ap-southeast-4', name: 'ap-southeast-4' },
                    { label: 'ap-southeast-5', name: 'ap-southeast-5' },
                    { label: 'ap-southeast-6', name: 'ap-southeast-6' },
                    { label: 'ca-central-1', name: 'ca-central-1' },
                    { label: 'ca-west-1', name: 'ca-west-1' },
                    { label: 'cn-north-1', name: 'cn-north-1' },
                    { label: 'cn-northwest-1', name: 'cn-northwest-1' },
                    { label: 'eu-central-1', name: 'eu-central-1' },
                    { label: 'eu-central-2', name: 'eu-central-2' },
                    { label: 'eu-north-1', name: 'eu-north-1' },
                    { label: 'eu-south-1', name: 'eu-south-1' },
                    { label: 'eu-south-2', name: 'eu-south-2' },
                    { label: 'eu-west-1', name: 'eu-west-1' },
                    { label: 'eu-west-2', name: 'eu-west-2' },
                    { label: 'eu-west-3', name: 'eu-west-3' },
                    { label: 'il-central-1', name: 'il-central-1' },
                    { label: 'me-central-1', name: 'me-central-1' },
                    { label: 'me-south-1', name: 'me-south-1' },
                    { label: 'sa-east-1', name: 'sa-east-1' },
                    { label: 'us-east-1', name: 'us-east-1' },
                    { label: 'us-east-2', name: 'us-east-2' },
                    { label: 'us-gov-east-1', name: 'us-gov-east-1' },
                    { label: 'us-gov-west-1', name: 'us-gov-west-1' },
                    { label: 'us-west-1', name: 'us-west-1' },
                    { label: 'us-west-2', name: 'us-west-2' }
                ],
                default: 'us-east-1'
            },
            {
                label: 'Model Name',
                name: 'model',
                type: 'options',
                options: [
                    { label: 'amazon.titan-embed-text-v1', name: 'amazon.titan-embed-text-v1' },
                    { label: 'amazon.titan-embed-g1-text-02', name: 'amazon.titan-embed-g1-text-02' },
                    { label: 'cohere.embed-english-v3', name: 'cohere.embed-english-v3' },
                    { label: 'cohere.embed-multilingual-v3', name: 'cohere.embed-multilingual-v3' }
                ],
                default: 'amazon.titan-embed-text-v1'
            },
            {
                label: 'Custom Model Name',
                name: 'customModel',
                description: 'If provided, will override model selected from Model Name option',
                type: 'string',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iRegion = nodeData.inputs?.region as string
        const iModel = nodeData.inputs?.model as string
        const customModel = nodeData.inputs?.customModel as string

        const obj: BedrockEmbeddingsParams = {
            model: customModel ? customModel : iModel,
            region: iRegion
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        if (credentialData && Object.keys(credentialData).length !== 0) {
            const credentialApiKey = getCredentialParam('awsKey', credentialData, nodeData)
            const credentialApiSecret = getCredentialParam('awsSecret', credentialData, nodeData)
            const credentialApiSession = getCredentialParam('awsSession', credentialData, nodeData)

            obj.credentials = {
                accessKeyId: credentialApiKey,
                secretAccessKey: credentialApiSecret,
                sessionToken: credentialApiSession
            }
        }

        const client = new BedrockRuntimeClient({
            region: obj.region,
            credentials: obj.credentials
        })

        const model = new BedrockEmbeddings(obj)

        // Avoid Illegal Invocation
        model.embedQuery = async (document: string): Promise<number[]> => {
            const embeddings = await embedText([document], client, iModel)
            return embeddings[0]
        }

        model.embedDocuments = async (documents: string[]): Promise<number[][]> => {
            const chunkSize = 128
            // take all the incoming documents and re-chunk them into arrays of size 128
            // chunking text reduces round-trips to cohere
            const chunks = chunkArray(documents, chunkSize)
            const embeddings: number[][] = []

            for (const chunk of chunks) {
                const chunkEmbeddings = await embedText(chunk, client, iModel)
                embeddings.push(...chunkEmbeddings)
            }

            return embeddings
        }
        return model
    }
}

const embedText = async (texts: string[], client: BedrockRuntimeClient, model: string): Promise<number[][]> => {
    const cleanedTexts = texts.map((text) => text.replace(/\n/g, ' '))

    const command = {
        modelId: model,
        body: JSON.stringify({
            texts: cleanedTexts,
            input_type: 'search_document',
            truncate: 'END'
        }),
        contentType: 'application/json',
        accept: 'application/json'
    }
    const res = await client.send(new InvokeModelCommand(command))
    try {
        const body = new TextDecoder().decode(res.body)
        return JSON.parse(body).embeddings
    } catch (e) {
        throw new Error('An invalid response was returned by Bedrock.')
    }
}

const chunkArray = <T>(arr: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize))
    }
    return chunks
}

module.exports = { nodeClass: AWSBedrockEmbedding_Embeddings }
