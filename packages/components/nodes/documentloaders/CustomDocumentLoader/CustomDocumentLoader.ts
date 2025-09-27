import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { DataSource } from 'typeorm'
import { getVars, handleEscapeCharacters, executeJavaScriptCode, createCodeExecutionSandbox } from '../../../src/utils'

class CustomDocumentLoader_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Custom Document Loader'
        this.name = 'customDocumentLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'customDocLoader.svg'
        this.category = 'Document Loaders'
        this.description = `Custom function for loading documents`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Input Variables',
                name: 'functionInputVariables',
                description: 'Input variables can be used in the function with prefix $. For example: $var',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            },
            {
                label: 'Javascript Function',
                name: 'javascriptFunction',
                type: 'code',
                description: `Must return an array of document objects containing metadata and pageContent if "Document" is selected in the output. If "Text" is selected in the output, it must return a string.`,
                placeholder: `return [
  {
    pageContent: 'Document Content',
    metadata: {
      title: 'Document Title',
    }
  }
]`
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const output = nodeData.outputs?.output as string
        const javascriptFunction = nodeData.inputs?.javascriptFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

        const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
        const flow = {
            chatflowId: options.chatflowid,
            sessionId: options.sessionId,
            chatId: options.chatId,
            input
        }

        let inputVars: ICommonObject = {}
        if (functionInputVariablesRaw) {
            try {
                inputVars =
                    typeof functionInputVariablesRaw === 'object' ? functionInputVariablesRaw : JSON.parse(functionInputVariablesRaw)
            } catch (exception) {
                throw new Error('Invalid JSON in the Custom Document Loader Input Variables: ' + exception)
            }
        }

        // Some values might be a stringified JSON, parse it
        for (const key in inputVars) {
            let value = inputVars[key]
            if (typeof value === 'string') {
                value = handleEscapeCharacters(value, true)
                if (value.startsWith('{') && value.endsWith('}')) {
                    try {
                        value = JSON.parse(value)
                    } catch (e) {
                        // ignore
                    }
                }
                inputVars[key] = value
            }
        }

        // Create additional sandbox variables
        const additionalSandbox: ICommonObject = {}

        // Add input variables to sandbox
        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                additionalSandbox[`$${item}`] = inputVars[item]
            }
        }

        const sandbox = createCodeExecutionSandbox(input, variables, flow, additionalSandbox)

        try {
            const response = await executeJavaScriptCode(javascriptFunction, sandbox, {
                libraries: ['axios']
            })

            if (output === 'document' && Array.isArray(response)) {
                if (response.length === 0) return response
                if (
                    response[0].pageContent &&
                    typeof response[0].pageContent === 'string' &&
                    response[0].metadata &&
                    typeof response[0].metadata === 'object'
                )
                    return response
                throw new Error('Document object must contain pageContent and metadata')
            }

            if (output === 'text' && typeof response === 'string') {
                return handleEscapeCharacters(response, false)
            }

            return response
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CustomDocumentLoader_DocumentLoaders }
