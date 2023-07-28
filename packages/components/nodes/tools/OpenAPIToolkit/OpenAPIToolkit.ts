import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { OpenApiToolkit } from 'langchain/agents'
import { JsonSpec, JsonObject } from 'langchain/tools'
import { BaseLanguageModel } from 'langchain/base_language'
import { load } from 'js-yaml'
import { getCredentialData, getCredentialParam } from '../../../src'

class OpenAPIToolkit_Tools implements INode {
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
        this.label = 'OpenAPI Toolkit'
        this.name = 'openAPIToolkit'
        this.version = 1.0
        this.type = 'OpenAPIToolkit'
        this.icon = 'openapi.png'
        this.category = 'Tools'
        this.description = 'Load OpenAPI specification'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed if the YAML OpenAPI Spec requires authentication',
            optional: true,
            credentialNames: ['openAPIAuth']
        }
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'YAML File',
                name: 'yamlFile',
                type: 'file',
                fileType: '.yaml'
            }
        ]
        this.baseClasses = [this.type, 'Tool']
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const yamlFileBase64 = nodeData.inputs?.yamlFile as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAPIToken = getCredentialParam('openAPIToken', credentialData, nodeData)

        const splitDataURI = yamlFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const utf8String = bf.toString('utf-8')
        const data = load(utf8String) as JsonObject
        if (!data) {
            throw new Error('Failed to load OpenAPI spec')
        }

        const headers: ICommonObject = {
            'Content-Type': 'application/json'
        }
        if (openAPIToken) headers.Authorization = `Bearer ${openAPIToken}`
        const toolkit = new OpenApiToolkit(new JsonSpec(data), model, headers)

        return toolkit.tools
    }
}

module.exports = { nodeClass: OpenAPIToolkit_Tools }
