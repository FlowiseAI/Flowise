import { DataSource } from 'typeorm'
import { z } from 'zod'
import { RunnableConfig } from '@langchain/core/runnables'
import { CallbackManagerForToolRun, Callbacks, CallbackManager, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { StructuredTool } from '@langchain/core/tools'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import {
    getCredentialData,
    getCredentialParam,
    executeJavaScriptCode,
    createCodeExecutionSandbox,
    parseWithTypeConversion
} from '../../../src/utils'
import { isValidUUID, isValidURL } from '../../../src/validator'
import { v4 as uuidv4 } from 'uuid'

class AgentAsTool_Tools implements INode {
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
        this.label = 'Agent as Tool'
        this.name = 'agentAsTool'
        this.version = 1.0
        this.type = 'AgentAsTool'
        this.icon = 'agentastool.svg'
        this.category = 'Tools'
        this.description = 'Use as a tool to execute another agentflow'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['agentflowApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Select Agent',
                name: 'selectedAgentflow',
                type: 'asyncOptions',
                loadMethod: 'listAgentflows'
            },
            {
                label: 'Tool Name',
                name: 'name',
                type: 'string'
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'Description of what the tool does. This is for LLM to determine when to use this tool.',
                rows: 3,
                placeholder:
                    'State of the Union QA - useful for when you need to ask questions about the most recent state of the union address.'
            },
            {
                label: 'Return Direct',
                name: 'returnDirect',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Override Config',
                name: 'overrideConfig',
                description: 'Override the config passed to the Agentflow.',
                type: 'json',
                optional: true,
                additionalParams: true,
                acceptVariable: true
            },
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                description:
                    'Base URL to Flowise. By default, it is the URL of the incoming request. Useful when you need to execute the Agentflow through an alternative route.',
                placeholder: 'http://localhost:3000',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Start new session per message',
                name: 'startNewSession',
                type: 'boolean',
                description:
                    'Whether to continue the session with the Agentflow tool or start a new one with each interaction. Useful for Agentflows with memory if you want to avoid it.',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Use Question from Chat',
                name: 'useQuestionFromChat',
                type: 'boolean',
                description:
                    'Whether to use the question from the chat as input to the agentflow. If turned on, this will override the custom input.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Custom Input',
                name: 'customInput',
                type: 'string',
                description: 'Custom input to be passed to the agentflow. Leave empty to let LLM decides the input.',
                optional: true,
                additionalParams: true,
                show: {
                    useQuestionFromChat: false
                }
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listAgentflows(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const agentflows = await appDataSource.getRepository(databaseEntities['ChatFlow']).findBy({
                ...searchOptions,
                type: 'AGENTFLOW'
            })

            for (let i = 0; i < agentflows.length; i += 1) {
                const data = {
                    label: agentflows[i].name,
                    name: agentflows[i].id
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const selectedAgentflowId = nodeData.inputs?.selectedAgentflow as string
        const _name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const useQuestionFromChat = nodeData.inputs?.useQuestionFromChat as boolean
        const returnDirect = nodeData.inputs?.returnDirect as boolean
        const customInput = nodeData.inputs?.customInput as string
        const overrideConfig =
            typeof nodeData.inputs?.overrideConfig === 'string' &&
            nodeData.inputs.overrideConfig.startsWith('{') &&
            nodeData.inputs.overrideConfig.endsWith('}')
                ? JSON.parse(nodeData.inputs.overrideConfig)
                : nodeData.inputs?.overrideConfig

        const startNewSession = nodeData.inputs?.startNewSession as boolean

        const baseURL = (nodeData.inputs?.baseURL as string) || (options.baseURL as string)

        // Validate agentflowid is a valid UUID
        if (!selectedAgentflowId || !isValidUUID(selectedAgentflowId)) {
            throw new Error('Invalid agentflow ID: must be a valid UUID')
        }

        // Validate baseURL is a valid URL
        if (!baseURL || !isValidURL(baseURL)) {
            throw new Error('Invalid base URL: must be a valid URL')
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const agentflowApiKey = getCredentialParam('agentflowApiKey', credentialData, nodeData)

        if (selectedAgentflowId === options.chatflowid) throw new Error('Cannot call the same agentflow!')

        let headers = {}
        if (agentflowApiKey) headers = { Authorization: `Bearer ${agentflowApiKey}` }

        let toolInput = ''
        if (useQuestionFromChat) {
            toolInput = input
        } else if (customInput) {
            toolInput = customInput
        }

        let name = _name || 'agentflow_tool'

        return new AgentflowTool({
            name,
            baseURL,
            description,
            returnDirect,
            agentflowid: selectedAgentflowId,
            startNewSession,
            headers,
            input: toolInput,
            overrideConfig
        })
    }
}

class AgentflowTool extends StructuredTool {
    static lc_name() {
        return 'AgentflowTool'
    }

    name = 'agentflow_tool'

    description = 'Execute another agentflow'

    input = ''

    agentflowid = ''

    startNewSession = false

    baseURL = 'http://localhost:3000'

    headers = {}

    overrideConfig?: object

    schema = z.object({
        input: z.string().describe('input question')
        // overrideConfig: z.record(z.any()).optional().describe('override config'), // This will be passed to the Agent, so comment it for now.
    }) as any

    constructor({
        name,
        description,
        returnDirect,
        input,
        agentflowid,
        startNewSession,
        baseURL,
        headers,
        overrideConfig
    }: {
        name: string
        description: string
        returnDirect: boolean
        input: string
        agentflowid: string
        startNewSession: boolean
        baseURL: string
        headers: ICommonObject
        overrideConfig?: object
    }) {
        super()
        this.name = name
        this.description = description
        this.input = input
        this.baseURL = baseURL
        this.startNewSession = startNewSession
        this.headers = headers
        this.agentflowid = agentflowid
        this.overrideConfig = overrideConfig
        this.returnDirect = returnDirect
    }

    async call(
        arg: z.infer<typeof this.schema>,
        configArg?: RunnableConfig | Callbacks,
        tags?: string[],
        flowConfig?: { sessionId?: string; chatId?: string; input?: string }
    ): Promise<string> {
        const config = parseCallbackConfigArg(configArg)
        if (config.runName === undefined) {
            config.runName = this.name
        }
        let parsed
        try {
            parsed = await parseWithTypeConversion(this.schema, arg)
        } catch (e) {
            throw new Error(`Received tool input did not match expected schema: ${JSON.stringify(arg)}`)
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
        const inputQuestion = this.input || arg.input

        const body = {
            question: inputQuestion,
            chatId: this.startNewSession ? uuidv4() : flowConfig?.chatId,
            overrideConfig: {
                sessionId: this.startNewSession ? uuidv4() : flowConfig?.sessionId,
                ...(this.overrideConfig ?? {}),
                ...(arg.overrideConfig ?? {})
            }
        }

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'flowise-tool': 'true',
                ...this.headers
            },
            body: JSON.stringify(body)
        }

        const code = `
const fetch = require('node-fetch');
const url = "${this.baseURL}/api/v1/prediction/${this.agentflowid}";

const body = $callBody;

const options = $callOptions;

try {
	const response = await fetch(url, options);
	const resp = await response.json();
	return resp.text;
} catch (error) {
	console.error(error);
	return '';
}
`

        // Create additional sandbox variables
        const additionalSandbox: ICommonObject = {
            $callOptions: options,
            $callBody: body
        }

        const sandbox = createCodeExecutionSandbox('', [], {}, additionalSandbox)

        let response = await executeJavaScriptCode(code, sandbox, {
            useSandbox: false
        })

        if (typeof response === 'object') {
            response = JSON.stringify(response)
        }

        return response
    }
}

module.exports = { nodeClass: AgentAsTool_Tools }
