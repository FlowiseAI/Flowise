import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Cohere, CohereInput } from './core'

class Cohere_LLMs implements INode {
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
        this.label = 'Cohere'
        this.name = 'cohere'
        this.version = 1.0
        this.type = 'Cohere'
        this.icon = 'cohere.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around Cohere large language models'
        this.baseClasses = [this.type, ...getBaseClasses(Cohere)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cohereApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'command',
                        name: 'command'
                    },
                    {
                        label: 'command-light',
                        name: 'command-light'
                    },
                    {
                        label: 'command-nightly',
                        name: 'command-nightly'
                    },
                    {
                        label: 'command-light-nightly',
                        name: 'command-light-nightly'
                    },
                    {
                        label: 'base',
                        name: 'base'
                    },
                    {
                        label: 'base-light',
                        name: 'base-light'
                    }
                ],
                default: 'command',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)

        const obj: CohereInput = {
            apiKey: cohereApiKey
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (modelName) obj.model = modelName
        if (temperature) obj.temperature = parseFloat(temperature)

        const model = new Cohere(obj)
        return model
    }
}

module.exports = { nodeClass: Cohere_LLMs }
