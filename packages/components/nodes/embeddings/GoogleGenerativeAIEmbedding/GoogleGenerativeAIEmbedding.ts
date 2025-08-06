import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { GoogleGenerativeAIEmbeddings, GoogleGenerativeAIEmbeddingsParams } from '@langchain/google-genai'
import { TaskType } from '@google/generative-ai'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

class GoogleGenerativeAIEmbeddingsWithStripNewLines extends GoogleGenerativeAIEmbeddings {
    stripNewLines: boolean

    constructor(params: GoogleGenerativeAIEmbeddingsParams & { stripNewLines?: boolean }) {
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

class GoogleGenerativeAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'GoogleGenerativeAI Embeddings'
        this.name = 'googleGenerativeAiEmbeddings'
        this.version = 2.0
        this.type = 'GoogleGenerativeAiEmbeddings'
        this.icon = 'GoogleGemini.svg'
        this.category = 'Embeddings'
        this.description = 'Google Generative API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(GoogleGenerativeAIEmbeddingsWithStripNewLines)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleGenerativeAI'],
            optional: false,
            description: 'Google Generative AI credential.'
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'embedding-001'
            },
            {
                label: 'Task Type',
                name: 'tasktype',
                type: 'options',
                description: 'Type of task for which the embedding will be used',
                options: [
                    { label: 'TASK_TYPE_UNSPECIFIED', name: 'TASK_TYPE_UNSPECIFIED' },
                    { label: 'RETRIEVAL_QUERY', name: 'RETRIEVAL_QUERY' },
                    { label: 'RETRIEVAL_DOCUMENT', name: 'RETRIEVAL_DOCUMENT' },
                    { label: 'SEMANTIC_SIMILARITY', name: 'SEMANTIC_SIMILARITY' },
                    { label: 'CLASSIFICATION', name: 'CLASSIFICATION' },
                    { label: 'CLUSTERING', name: 'CLUSTERING' }
                ],
                default: 'TASK_TYPE_UNSPECIFIED'
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
            return await getModels(MODEL_TYPE.EMBEDDING, 'googleGenerativeAiEmbeddings')
        }
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('googleGenerativeAPIKey', credentialData, nodeData)
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean

        let taskType: TaskType
        switch (nodeData.inputs?.tasktype as string) {
            case 'RETRIEVAL_QUERY':
                taskType = TaskType.RETRIEVAL_QUERY
                break
            case 'RETRIEVAL_DOCUMENT':
                taskType = TaskType.RETRIEVAL_DOCUMENT
                break
            case 'SEMANTIC_SIMILARITY':
                taskType = TaskType.SEMANTIC_SIMILARITY
                break
            case 'CLASSIFICATION':
                taskType = TaskType.CLASSIFICATION
                break
            case 'CLUSTERING':
                taskType = TaskType.CLUSTERING
                break
            default:
                taskType = TaskType.TASK_TYPE_UNSPECIFIED
                break
        }
        const obj: GoogleGenerativeAIEmbeddingsParams & { stripNewLines?: boolean } = {
            apiKey: apiKey,
            modelName: modelName,
            taskType: taskType,
            stripNewLines
        }

        const model = new GoogleGenerativeAIEmbeddingsWithStripNewLines(obj)
        return model
    }
}

module.exports = { nodeClass: GoogleGenerativeAIEmbedding_Embeddings }
