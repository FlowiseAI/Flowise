import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { StructuredTool, ToolInputParsingException, ToolParams } from '@langchain/core/tools'
import { z } from 'zod'
import { addSingleFileToStorage } from '../../../src/storageUtils'
import { CallbackManager, CallbackManagerForToolRun, Callbacks, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { RunnableConfig } from '@langchain/core/runnables'
import { ARTIFACTS_PREFIX } from '../../../src/agents'
import axios from 'axios'

const DESC = `Evaluates python code in a secure Azure Foundry sandbox environment. \
The environment is long running and exists across multiple executions. \
You must send the whole script every time and print your outputs. \
Script should be pure python code that can be evaluated. \
It should be in python format NOT markdown. \
The code should NOT be wrapped in backticks. \
All python packages including requests, matplotlib, scipy, numpy, pandas, \
etc are available. Create and display charts using "plt.show()".`
const NAME = 'azure_foundry_code_interpreter'

class Code_Interpreter_AzureFoundry implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    badge: string
    credential: INodeParams

    constructor() {
        this.label = 'Code Interpreter by Azure Foundry'
        this.name = 'codeInterpreterAzureFoundry'
        this.version = 1.0
        this.type = 'CodeInterpreter'
        this.icon = 'azurefoundry.svg'
        this.category = 'Tools'
        this.description = 'Execute Python code in an Azure Foundry sandbox environment with support for data analysis and visualization'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(AzureFoundryTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureFoundryApi'],
            optional: false
        }
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Specify the name of the tool',
                default: 'azure_foundry_code_interpreter'
            },
            {
                label: 'Tool Description',
                name: 'toolDesc',
                type: 'string',
                rows: 4,
                description: 'Specify the description of the tool',
                default: DESC
            },
            {
                label: 'Session Timeout (seconds)',
                name: 'sessionTimeout',
                type: 'number',
                description: 'Timeout for the code execution session',
                default: 300,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const toolDesc = nodeData.inputs?.toolDesc as string
        const toolName = nodeData.inputs?.toolName as string
        const sessionTimeout = nodeData.inputs?.sessionTimeout as number

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureFoundryApiKey = getCredentialParam('azureFoundryApiKey', credentialData, nodeData)
        const azureFoundryEndpoint = getCredentialParam('azureFoundryEndpoint', credentialData, nodeData)

        return await AzureFoundryTool.initialize({
            description: toolDesc ?? DESC,
            name: toolName ?? NAME,
            apiKey: azureFoundryApiKey,
            endpoint: azureFoundryEndpoint,
            schema: z.object({
                input: z.string().describe('Python code to be executed in the Azure Foundry sandbox environment')
            }),
            chatflowid: options.chatflowid,
            orgId: options.orgId,
            sessionTimeout: sessionTimeout || 300
        })
    }
}

type AzureFoundryToolParams = ToolParams
type AzureFoundryToolInput = {
    name: string
    description: string
    apiKey: string
    endpoint: string
    schema: any
    chatflowid: string
    orgId: string
    sessionTimeout?: number
}

export class AzureFoundryTool extends StructuredTool {
    static lc_name() {
        return 'AzureFoundryTool'
    }

    name = NAME

    description = DESC

    apiKey: string

    endpoint: string

    schema

    chatflowid: string

    orgId: string

    flowObj: ICommonObject

    sessionTimeout: number

    sessionId?: string

    constructor(options: AzureFoundryToolParams & AzureFoundryToolInput) {
        super(options)
        this.description = options.description
        this.name = options.name
        this.apiKey = options.apiKey
        this.endpoint = options.endpoint
        this.schema = options.schema
        this.chatflowid = options.chatflowid
        this.orgId = options.orgId
        this.sessionTimeout = options.sessionTimeout || 300
    }

    static async initialize(options: Partial<AzureFoundryToolParams> & AzureFoundryToolInput) {
        return new this({
            name: options.name,
            description: options.description,
            apiKey: options.apiKey,
            endpoint: options.endpoint,
            schema: options.schema,
            chatflowid: options.chatflowid,
            orgId: options.orgId,
            sessionTimeout: options.sessionTimeout
        })
    }

    async call(
        arg: z.infer<typeof this.schema>,
        configArg?: RunnableConfig | Callbacks,
        tags?: string[],
        flowConfig?: { sessionId?: string; chatId?: string; input?: string; state?: ICommonObject }
    ): Promise<string> {
        const config = parseCallbackConfigArg(configArg)
        if (config.runName === undefined) {
            config.runName = this.name
        }
        let parsed
        try {
            parsed = await this.schema.parseAsync(arg)
        } catch (e) {
            throw new ToolInputParsingException(`Received tool input did not match expected schema`, JSON.stringify(arg))
        }
        const callbackManager_ = await CallbackManager.configure(
            config.callbacks,
            this.callbacks,
            config.tags || tags,
            this.tags,
            config.metadata,
            this.metadata,
            { verbose: this.verbose }
        )
        const runManager = await callbackManager_?.handleToolStart(
            this.toJSON(),
            typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
            undefined,
            undefined,
            undefined,
            undefined,
            config.runName
        )
        let result
        try {
            result = await this._call(parsed, runManager, flowConfig)
        } catch (e) {
            await runManager?.handleToolError(e)
            throw e
        }
        if (result && typeof result !== 'string') {
            result = JSON.stringify(result)
        }
        await runManager?.handleToolEnd(result)
        return result
    }

    // @ts-ignore
    protected async _call(
        arg: z.infer<typeof this.schema>,
        _?: CallbackManagerForToolRun,
        flowConfig?: { sessionId?: string; chatId?: string; input?: string }
    ): Promise<string> {
        flowConfig = { ...this.flowObj, ...flowConfig }
        try {
            if ('input' in arg) {
                const code = arg?.input

                // Create or reuse session
                if (!this.sessionId) {
                    this.sessionId = await this.createSession()
                }

                // Execute code in Azure Foundry
                const execution = await this.executeCode(code)

                const artifacts = []

                // Process outputs
                if (execution.outputs && Array.isArray(execution.outputs)) {
                    for (const output of execution.outputs) {
                        if (output.type === 'image' && output.data) {
                            // Handle image outputs (PNG, JPEG, etc.)
                            const imageFormat = output.format || 'png'
                            const imageData = Buffer.from(output.data, 'base64')
                            const filename = `artifact_${Date.now()}.${imageFormat}`
                            const mimeType = `image/${imageFormat}`

                            const { path } = await addSingleFileToStorage(
                                mimeType,
                                imageData,
                                filename,
                                this.orgId,
                                this.chatflowid,
                                flowConfig!.chatId as string
                            )

                            artifacts.push({ type: imageFormat, data: path })
                        } else if (output.type === 'file' && output.data) {
                            // Handle file outputs for download
                            const fileData = Buffer.from(output.data, 'base64')
                            const filename = output.filename || `file_${Date.now()}.txt`
                            const mimeType = output.mimeType || 'application/octet-stream'

                            const { path } = await addSingleFileToStorage(
                                mimeType,
                                fileData,
                                filename,
                                this.orgId,
                                this.chatflowid,
                                flowConfig!.chatId as string
                            )

                            artifacts.push({ type: 'file', data: path, filename: filename })
                        } else if (output.type === 'html' || output.type === 'markdown' || output.type === 'json') {
                            artifacts.push({ type: output.type, data: output.data })
                        }
                    }
                }

                let output = ''

                // Get text output
                if (execution.stdout) {
                    output = execution.stdout
                } else if (execution.result) {
                    output = typeof execution.result === 'string' ? execution.result : JSON.stringify(execution.result)
                }

                // Handle errors
                if (execution.error) {
                    return `Error: ${execution.error.message || JSON.stringify(execution.error)}`
                }

                return artifacts.length > 0 ? output + ARTIFACTS_PREFIX + JSON.stringify(artifacts) : output
            } else {
                return 'No input provided'
            }
        } catch (e: any) {
            // Clean up session on error
            if (this.sessionId) {
                await this.closeSession().catch(() => {})
                this.sessionId = undefined
            }
            return `Error: ${e.message || JSON.stringify(e)}`
        }
    }

    private async createSession(): Promise<string> {
        try {
            const response = await axios.post(
                `${this.endpoint}/code-interpreter/sessions`,
                {
                    timeout: this.sessionTimeout
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            return response.data.sessionId || response.data.id
        } catch (error: any) {
            throw new Error(`Failed to create Azure Foundry session: ${error.message}`)
        }
    }

    private async executeCode(code: string): Promise<any> {
        try {
            const response = await axios.post(
                `${this.endpoint}/code-interpreter/sessions/${this.sessionId}/execute`,
                {
                    code: code,
                    language: 'python'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            return response.data
        } catch (error: any) {
            if (error.response?.data) {
                return {
                    error: {
                        message: error.response.data.error || error.message
                    }
                }
            }
            throw new Error(`Failed to execute code: ${error.message}`)
        }
    }

    private async closeSession(): Promise<void> {
        if (!this.sessionId) return

        try {
            await axios.delete(`${this.endpoint}/code-interpreter/sessions/${this.sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            })
        } catch (error) {
            // Ignore errors when closing session
        }
    }

    setFlowObject(flowObj: ICommonObject) {
        this.flowObj = flowObj
    }
}

module.exports = { nodeClass: Code_Interpreter_AzureFoundry }
