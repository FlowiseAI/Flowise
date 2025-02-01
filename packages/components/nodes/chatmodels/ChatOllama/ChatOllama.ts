import { ChatOllamaInput } from '@langchain/ollama'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { BaseCache } from '@langchain/core/caches'
import { IMultiModalOption, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatOllama } from './FlowiseChatOllama'

class ChatOllama_ChatModels implements INode {
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
        this.label = 'ChatOllama'
        this.name = 'chatOllama'
        this.version = 5.0
        this.type = 'ChatOllama'
        this.icon = 'Ollama.svg'
        this.category = 'Chat Models'
        this.description = 'Chat completion using open-source LLM on Ollama'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOllama)]
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
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
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                description:
                    'The temperature of the model. Increasing the temperature will make the model answer more creatively. (Default: 0.8). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                default: false,
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'JSON Mode',
                name: 'jsonMode',
                type: 'boolean',
                description:
                    'Coerces model outputs to only return JSON. Specify in the system prompt to return JSON. Ex: Format all responses as JSON object',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Keep Alive',
                name: 'keepAlive',
                type: 'string',
                description: 'How long to keep connection alive. A duration string (such as "10m" or "24h")',
                default: '5m',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                description:
                    'Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. (Default: 0.9). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                description:
                    'Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative. (Default: 40). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Mirostat',
                name: 'mirostat',
                type: 'number',
                description:
                    'Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Mirostat ETA',
                name: 'mirostatEta',
                type: 'number',
                description:
                    'Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive. (Default: 0.1) Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Mirostat TAU',
                name: 'mirostatTau',
                type: 'number',
                description:
                    'Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text. (Default: 5.0) Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Context Window Size',
                name: 'numCtx',
                type: 'number',
                description:
                    'Sets the size of the context window used to generate the next token. (Default: 2048) Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 1,
                optional: true,
                additionalParams: true
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
                label: 'Repeat Last N',
                name: 'repeatLastN',
                type: 'number',
                description:
                    'Sets how far back for the model to look back to prevent repetition. (Default: 64, 0 = disabled, -1 = num_ctx). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Repeat Penalty',
                name: 'repeatPenalty',
                type: 'number',
                description:
                    'Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. (Default: 1.1). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Stop Sequence',
                name: 'stop',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description:
                    'Sets the stop sequences to use. Use comma to seperate different sequences. Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tail Free Sampling',
                name: 'tfsZ',
                type: 'number',
                description:
                    'Tail free sampling is used to reduce the impact of less probable tokens from the output. A higher value (e.g., 2.0) will reduce the impact more, while a value of 1.0 disables this setting. (Default: 1). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const baseUrl = nodeData.inputs?.baseUrl as string
        const modelName = nodeData.inputs?.modelName as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const mirostat = nodeData.inputs?.mirostat as string
        const mirostatEta = nodeData.inputs?.mirostatEta as string
        const mirostatTau = nodeData.inputs?.mirostatTau as string
        const numCtx = nodeData.inputs?.numCtx as string
        const keepAlive = nodeData.inputs?.keepAlive as string
        const numGpu = nodeData.inputs?.numGpu as string
        const numThread = nodeData.inputs?.numThread as string
        const repeatLastN = nodeData.inputs?.repeatLastN as string
        const repeatPenalty = nodeData.inputs?.repeatPenalty as string
        const tfsZ = nodeData.inputs?.tfsZ as string
        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const jsonMode = nodeData.inputs?.jsonMode as boolean
        const streaming = nodeData.inputs?.streaming as boolean

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOllamaInput & BaseChatModelParams = {
            baseUrl,
            temperature: parseFloat(temperature),
            model: modelName,
            streaming: streaming ?? true
        }

        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (mirostat) obj.mirostat = parseFloat(mirostat)
        if (mirostatEta) obj.mirostatEta = parseFloat(mirostatEta)
        if (mirostatTau) obj.mirostatTau = parseFloat(mirostatTau)
        if (numCtx) obj.numCtx = parseFloat(numCtx)
        if (numGpu) obj.numGpu = parseFloat(numGpu)
        if (numThread) obj.numThread = parseFloat(numThread)
        if (repeatLastN) obj.repeatLastN = parseFloat(repeatLastN)
        if (repeatPenalty) obj.repeatPenalty = parseFloat(repeatPenalty)
        if (tfsZ) obj.tfsZ = parseFloat(tfsZ)
        if (keepAlive) obj.keepAlive = keepAlive
        if (cache) obj.cache = cache
        if (jsonMode) obj.format = 'json'

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const model = new ChatOllama(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatOllama_ChatModels }
