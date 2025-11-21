import { GoogleVertexAIEmbeddingsInput, VertexAIEmbeddings } from '@langchain/google-vertexai'
import { buildGoogleCredentials } from '../../../src/google-utils'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels, getRegions } from '../../../src/modelLoader'
import { getBaseClasses } from '../../../src/utils'

class VertexAIEmbeddingsWithStripNewLines extends VertexAIEmbeddings {
    stripNewLines: boolean

    constructor(params: GoogleVertexAIEmbeddingsInput & { stripNewLines?: boolean }) {
        super(params)
        this.stripNewLines = params.stripNewLines ?? false
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const processedTexts = this.stripNewLines ? texts.map((text) => text.replace(/\n/g, ' ')) : texts
        return super.embedDocuments(processedTexts)
    }

    async embedQuery(text: string): Promise<number[]> {
        const processedText = this.stripNewLines ? text.replace(/\n/g, ' ') : text
        return super.embedQuery(processedText)
    }
}

class GoogleVertexAIEmbedding_Embeddings implements INode {
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
        this.label = 'GoogleVertexAI Embeddings'
        this.name = 'googlevertexaiEmbeddings'
        this.version = 2.1
        this.type = 'GoogleVertexAIEmbeddings'
        this.icon = 'GoogleVertex.svg'
        this.category = 'Embeddings'
        this.description = 'Google vertexAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(VertexAIEmbeddingsWithStripNewLines)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth'],
            optional: true,
            description:
                'Google Vertex AI credential. If you are using a GCP service like Cloud Run, or if you have installed default credentials on your local machine, you do not need to set this credential.'
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'text-embedding-004'
            },
            {
                label: 'Region',
                description: 'Region to use for the model.',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                optional: true
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                description: 'Remove new lines from input text before embedding to reduce token count'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'googlevertexaiEmbeddings')
        },
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.EMBEDDING, 'googlevertexaiEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const region = nodeData.inputs?.region as string
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean

        const obj: GoogleVertexAIEmbeddingsInput & { stripNewLines?: boolean } = {
            model: modelName,
            stripNewLines
        }

        const authOptions = await buildGoogleCredentials(nodeData, options)
        if (authOptions && Object.keys(authOptions).length !== 0) obj.authOptions = authOptions

        if (region) obj.location = region

        const model = new VertexAIEmbeddingsWithStripNewLines(obj)
        return model
    }
}

module.exports = { nodeClass: GoogleVertexAIEmbedding_Embeddings }
