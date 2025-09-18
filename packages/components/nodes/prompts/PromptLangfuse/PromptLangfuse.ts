import { ICommonObject, INode, INodeData, INodeParams, PromptTemplate } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, getInputVariables, transformBracesWithColon } from '../../../src/utils'
import { PromptTemplateInput } from '@langchain/core/prompts'
import { Langfuse } from 'langfuse'

class PromptLangfuse_Prompts implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'LangFuse Prompt Template'
        this.name = 'promptLangFuse'
        this.version = 1.0
        this.type = 'PromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.author = 'Lucas Cruz'
        this.description = 'Fetch schema from LangFuse to represent a prompt for an LLM'
        this.baseClasses = [...getBaseClasses(PromptTemplate)]
        this.credential = {
            label: 'Langfuse Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['langfuseApi']
        }
        this.inputs = [
            {
                label: 'Prompt Name',
                name: 'template',
                type: 'string',
                placeholder: `Name of the template`
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
        const langFuseSecretKey = getCredentialParam('langFuseSecretKey', credentialData, nodeData)
        const langFusePublicKey = getCredentialParam('langFusePublicKey', credentialData, nodeData)
        const langFuseEndpoint = getCredentialParam('langFuseEndpoint', credentialData, nodeData)

        const langfuse = new Langfuse({
            secretKey: langFuseSecretKey,
            publicKey: langFusePublicKey,
            baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com',
            sdkIntegration: 'Flowise'
        })

        const langfusePrompt = await langfuse.getPrompt(nodeData.inputs?.template as string)
        let template = langfusePrompt.getLangchainPrompt()

        const promptValuesStr = nodeData.inputs?.promptValues

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                promptValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the PromptTemplate's promptValues: " + exception)
            }
        }

        const inputVariables = getInputVariables(template)
        template = transformBracesWithColon(template)

        try {
            const options: PromptTemplateInput = {
                template,
                inputVariables
            }
            const prompt = new PromptTemplate(options)
            prompt.promptValues = promptValues
            return prompt
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: PromptLangfuse_Prompts }
