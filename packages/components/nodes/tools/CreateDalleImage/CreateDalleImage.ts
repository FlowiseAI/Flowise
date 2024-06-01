import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import fetch from 'node-fetch'

export const desc = `Use this when you want to create an image using Dall-E. The prompt should be a string. The model is optional and defaults to 'dall-e-2'.`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    prompt?: string
    model?: string
    apiKey?: string
}

export class DallePostTool extends Tool {
    name = 'create_dalle_image'
    description = desc
    prompt = ''
    model = 'dall-e-2'
    apiKey = ''

    constructor(args?: RequestParameters) {
        super()
        this.prompt = args?.prompt ?? this.prompt
        this.model = args?.model ?? this.model
        this.apiKey = args?.apiKey ?? ''
    }

    /** @ignore */
    async _call(input: string) {
        try {
            let inputBody = {
                prompt: input || this.prompt,
                model: this.model
            }

            const res = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(inputBody)
            })

            const text = await res.text()
            return text
        } catch (error) {
            return `${error}`
        }
    }
}

class DallePost_Tool implements INode {
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
        this.label = 'Dall-E Post'
        this.name = 'dallePost'
        this.version = 1.0
        this.type = 'DallePost'
        this.icon = 'openai.svg'
        this.category = 'Tools'
        this.description = 'Creates an image using Dall-E'
        this.baseClasses = [this.type, ...getBaseClasses(DallePostTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                description: 'The prompt that will be used to generate the image. The prompt should be a string.'
            },
            {
                label: 'Model',
                name: 'model',
                type: 'string',
                default: 'dall-e-2',
                description: 'The model to use for generating the image.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const prompt = nodeData.inputs?.prompt as string
        const model = nodeData.inputs?.model as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const obj: RequestParameters = {}
        if (prompt) obj.prompt = prompt
        if (model) obj.model = model
        if (openAIApiKey) obj.apiKey = openAIApiKey

        return new DallePostTool(obj)
    }
}

module.exports = { nodeClass: DallePost_Tool }
