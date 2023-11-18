import { ICommonObject, INode, INodeData, INodeParams, PromptTemplate } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { pull } from 'langchain/hub'

class LsHubPromptTemplate_Prompts implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Load Prompt from Langsmith Hub'
        this.name = 'lsPromptTemplate'
        this.version = 1.0
        this.type = 'LsPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description = 'Schema to represent a basic prompt for an LLM'
        this.baseClasses = [...getBaseClasses(PromptTemplate)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['langsmithApi']
        }
        this.inputs = [
            {
                label: 'Tag',
                name: 'promptName',
                type: 'promptLookup',
                description: 'Use the format {owner}/{repo}:{commit}. If no commit is specified, the latest commit will be used.',
                placeholder: 'hwchase17/my-first-prompt'
            },
            {
                label: 'Template',
                name: 'template',
                type: 'string',
                rows: 4,
                placeholder: `What is a good name for a company that makes {product}?`
            },
            {
                label: 'Format Prompt Values',
                name: 'promptValues',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const promptValuesStr = nodeData.inputs?.promptValues
        const promptName = nodeData.inputs?.promptName as string
        const langSmithApiKey = getCredentialParam('langSmithApiKey', credentialData, nodeData)
        const langSmithEndpoint = getCredentialParam('langSmithEndpoint', credentialData, nodeData)

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                promptValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the PromptTemplate's promptValues: " + exception)
            }
        }

        try {
            const prompt = await pull(promptName, {
                apiKey: langSmithApiKey,
                apiUrl: langSmithEndpoint
            })

            if (prompt) {
                ;(prompt as PromptTemplate).partialVariables = promptValues
            }
            return prompt
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: LsHubPromptTemplate_Prompts }
