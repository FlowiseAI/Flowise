import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, parseWithTypeConversion } from '../../../src/utils'
import { StructuredTool, ToolInputParsingException, ToolParams } from '@langchain/core/tools'
import { Sandbox } from '@e2b/code-interpreter'
import { z } from 'zod'
import { addSingleFileToStorage } from '../../../src/storageUtils'
import { CallbackManager, CallbackManagerForToolRun, Callbacks, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { RunnableConfig } from '@langchain/core/runnables'
import { ARTIFACTS_PREFIX } from '../../../src/agents'

const DESC = `Evaluates python code in a sandbox environment. \
The environment is long running and exists across multiple executions. \
You must send the whole script every time and print your outputs. \
Script should be pure python code that can be evaluated. \
It should be in python format NOT markdown. \
The code should NOT be wrapped in backticks. \
All python packages including requests, matplotlib, scipy, numpy, pandas, \
etc are available. Create and display chart using "plt.show()".`
const NAME = 'code_interpreter'

class Code_Interpreter_Tools implements INode {
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
        this.label = 'Code Interpreter by E2B'
        this.name = 'codeInterpreterE2B'
        this.version = 1.0
        this.type = 'CodeInterpreter'
        this.icon = 'e2b.png'
        this.category = 'Tools'
        this.description = 'Execute code in a sandbox environment'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(E2BTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['E2BApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Specify the name of the tool',
                default: 'code_interpreter'
            },
            {
                label: 'Tool Description',
                name: 'toolDesc',
                type: 'string',
                rows: 4,
                description: 'Specify the description of the tool',
                default: DESC
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const toolDesc = nodeData.inputs?.toolDesc as string
        const toolName = nodeData.inputs?.toolName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const e2bApiKey = getCredentialParam('e2bApiKey', credentialData, nodeData)

        return await E2BTool.initialize({
            description: toolDesc ?? DESC,
            name: toolName ?? NAME,
            apiKey: e2bApiKey,
            schema: z.object({
                input: z.string().describe('Python code to be executed in the sandbox environment')
            }),
            chatflowid: options.chatflowid,
            orgId: options.orgId
        })
    }
}

type E2BToolParams = ToolParams
type E2BToolInput = {
    name: string
    description: string
    apiKey: string
    schema: any
    chatflowid: string
    orgId: string
    templateCodeInterpreterE2B?: string
    domainCodeInterpreterE2B?: string
}

export class E2BTool extends StructuredTool {
    static lc_name() {
        return 'E2BTool'
    }

    name = NAME

    description = DESC

    instance: Sandbox

    apiKey: string

    schema

    chatflowid: string

    orgId: string

    flowObj: ICommonObject

    templateCodeInterpreterE2B?: string
    domainCodeInterpreterE2B?: string

    constructor(options: E2BToolParams & E2BToolInput) {
        super(options)
        this.description = options.description
        this.name = options.name
        this.apiKey = options.apiKey
        this.schema = options.schema
        this.chatflowid = options.chatflowid
        this.orgId = options.orgId
        this.templateCodeInterpreterE2B = options.templateCodeInterpreterE2B
        this.domainCodeInterpreterE2B = options.domainCodeInterpreterE2B
    }

    static async initialize(options: Partial<E2BToolParams> & E2BToolInput) {
        return new this({
            name: options.name,
            description: options.description,
            apiKey: options.apiKey,
            schema: options.schema,
            chatflowid: options.chatflowid,
            orgId: options.orgId,
            templateCodeInterpreterE2B: options.templateCodeInterpreterE2B,
            domainCodeInterpreterE2B: options.domainCodeInterpreterE2B
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
            parsed = await parseWithTypeConversion(this.schema, arg)
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
                this.instance = await Sandbox.create({ apiKey: this.apiKey })
                const execution = await this.instance.runCode(arg?.input, { language: 'python' })

                const artifacts = []
                for (const result of execution.results) {
                    for (const key in result) {
                        if (!(result as any)[key]) continue

                        if (key === 'png') {
                            //@ts-ignore
                            const pngData = Buffer.from(result.png, 'base64')

                            const filename = `artifact_${Date.now()}.png`

                            // Don't check storage usage because this is incoming file, and if we throw error, agent will keep on retrying
                            const { path } = await addSingleFileToStorage(
                                'image/png',
                                pngData,
                                filename,
                                this.orgId,
                                this.chatflowid,
                                flowConfig!.chatId as string
                            )

                            artifacts.push({ type: 'png', data: path })
                        } else if (key === 'jpeg') {
                            //@ts-ignore
                            const jpegData = Buffer.from(result.jpeg, 'base64')

                            const filename = `artifact_${Date.now()}.jpg`

                            const { path } = await addSingleFileToStorage(
                                'image/jpg',
                                jpegData,
                                filename,
                                this.orgId,
                                this.chatflowid,
                                flowConfig!.chatId as string
                            )

                            artifacts.push({ type: 'jpeg', data: path })
                        } else if (key === 'html' || key === 'markdown' || key === 'latex' || key === 'json' || key === 'javascript') {
                            artifacts.push({ type: key, data: (result as any)[key] })
                        } //TODO: support for pdf
                    }
                }

                let output = ''

                if (execution.text) output = execution.text
                if (!execution.text && execution.logs.stdout.length) output = execution.logs.stdout.join('\n')

                if (execution.error) {
                    return `${execution.error.name}: ${execution.error.value}`
                }

                return artifacts.length > 0 ? output + ARTIFACTS_PREFIX + JSON.stringify(artifacts) : output
            } else {
                return 'No input provided'
            }
        } catch (e) {
            if (this.instance) this.instance.kill()
            return typeof e === 'string' ? e : JSON.stringify(e, null, 2)
        }
    }

    setFlowObject(flowObj: ICommonObject) {
        this.flowObj = flowObj
    }
}

module.exports = { nodeClass: Code_Interpreter_Tools }
