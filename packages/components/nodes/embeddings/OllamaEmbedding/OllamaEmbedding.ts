import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama'
import { OllamaInput } from '@langchain/community/llms/ollama'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class OllamaEmbedding_Embeddings implements INode {
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
        this.label = 'Ollama Embeddings'
        this.name = 'ollamaEmbedding'
        this.version = 1.0
        this.type = 'OllamaEmbeddings'
        this.icon = 'Ollama.svg'
        this.category = 'Embeddings'
        this.description = 'Generate embeddings for a given text using open source model on Ollama'
        this.baseClasses = [this.type, ...getBaseClasses(OllamaEmbeddings)]
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'http://localhost:11434'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'llama2'
            },
            {
                label: 'Number of GPU',
                name: 'numGpu',
                type: 'number',
                description:
                    'The number of layers to send to the GPU(s). On macOS it defaults to 1 to enable metal support, 0 to disable. Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Number of Thread',
                name: 'numThread',
                type: 'number',
                description:
                    'Sets the number of threads to use during computation. By default, Ollama will detect this for optimal performance. It is recommended to set this value to the number of physical CPU cores your system has (as opposed to the logical number of cores). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Use MMap',
                name: 'useMMap',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const baseUrl = nodeData.inputs?.baseUrl as string
        const numThread = nodeData.inputs?.numThread as string
        const numGpu = nodeData.inputs?.numGpu as string
        const useMMap = nodeData.inputs?.useMMap as boolean

        const obj = {
            model: modelName,
            baseUrl,
            requestOptions: {}
        }

        const requestOptions: OllamaInput = {}
        if (numThread) requestOptions.numThread = parseFloat(numThread)
        if (numGpu) requestOptions.numGpu = parseFloat(numGpu)

        // default useMMap to true
        requestOptions.useMMap = useMMap === undefined ? true : useMMap

        if (Object.keys(requestOptions).length) obj.requestOptions = requestOptions

        const model = new OllamaEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: OllamaEmbedding_Embeddings }
