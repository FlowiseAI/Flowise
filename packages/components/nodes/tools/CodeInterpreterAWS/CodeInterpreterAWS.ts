import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { StructuredTool, ToolInputParsingException, ToolParams } from '@langchain/core/tools'
import { z } from 'zod'
import { CallbackManager, CallbackManagerForToolRun, Callbacks, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { RunnableConfig } from '@langchain/core/runnables'
import { ARTIFACTS_PREFIX } from '../../../src/agents'
import {
    BedrockAgentCoreClient,
    StopCodeInterpreterSessionCommand,
    InvokeCodeInterpreterCommand,
    InvokeCodeInterpreterCommandInput,
    BedrockAgentCoreClientConfig
} from '@aws-sdk/client-bedrock-agentcore'

const DESC = `Evaluates python code in a sandbox environment. \
The environment is long running and exists across multiple executions. \
You must send the whole script every time and print your outputs. \
Script should be pure python code that can be evaluated. \
It should be in python format NOT markdown. \
The code should NOT be wrapped in backticks. \
All python packages including requests, matplotlib, scipy, numpy, pandas, \
etc are available. Create and display chart using "plt.show()".`
const NAME = 'code_interpreter'

class Code_InterpreterAWS_Tools implements INode {
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
        this.label = 'Code Interpreter by AWS AgentCore'
        this.name = 'codeInterpreterAWS'
        this.version = 1.0
        this.type = 'CodeInterpreter'
        this.icon = 'agentcore.png'
        this.category = 'Tools'
        this.description = 'Execute code in a sandbox environment by AWS AgentCore'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(AWSAgentCoreTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi']
        }
        this.inputs = [
            {
                label: 'AWS Region',
                name: 'region',
                type: 'options',
                options: [
                    { label: 'US East (N. Virginia) - us-east-1', name: 'us-east-1' },
                    { label: 'US East (Ohio) - us-east-2', name: 'us-east-2' },
                    { label: 'US West (N. California) - us-west-1', name: 'us-west-1' },
                    { label: 'US West (Oregon) - us-west-2', name: 'us-west-2' },
                    { label: 'Africa (Cape Town) - af-south-1', name: 'af-south-1' },
                    { label: 'Asia Pacific (Hong Kong) - ap-east-1', name: 'ap-east-1' },
                    { label: 'Asia Pacific (Mumbai) - ap-south-1', name: 'ap-south-1' },
                    { label: 'Asia Pacific (Osaka) - ap-northeast-3', name: 'ap-northeast-3' },
                    { label: 'Asia Pacific (Seoul) - ap-northeast-2', name: 'ap-northeast-2' },
                    { label: 'Asia Pacific (Singapore) - ap-southeast-1', name: 'ap-southeast-1' },
                    { label: 'Asia Pacific (Sydney) - ap-southeast-2', name: 'ap-southeast-2' },
                    { label: 'Asia Pacific (Tokyo) - ap-northeast-1', name: 'ap-northeast-1' },
                    { label: 'Canada (Central) - ca-central-1', name: 'ca-central-1' },
                    { label: 'Europe (Frankfurt) - eu-central-1', name: 'eu-central-1' },
                    { label: 'Europe (Ireland) - eu-west-1', name: 'eu-west-1' },
                    { label: 'Europe (London) - eu-west-2', name: 'eu-west-2' },
                    { label: 'Europe (Milan) - eu-south-1', name: 'eu-south-1' },
                    { label: 'Europe (Paris) - eu-west-3', name: 'eu-west-3' },
                    { label: 'Europe (Stockholm) - eu-north-1', name: 'eu-north-1' },
                    { label: 'Middle East (Bahrain) - me-south-1', name: 'me-south-1' },
                    { label: 'South America (São Paulo) - sa-east-1', name: 'sa-east-1' }
                ],
                default: 'us-east-1',
                description: 'AWS Region for AgentCore'
            },
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
        const region = nodeData.inputs?.region as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
        const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)
        const sessionToken = getCredentialParam('awsSession', credentialData, nodeData)

        return await AWSAgentCoreTool.initialize({
            description: toolDesc ?? DESC,
            name: toolName ?? NAME,
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            sessionToken: sessionToken,
            region: region,
            schema: z.object({
                input: z.string().describe('Python code to be executed in the sandbox environment')
            }),
            chatflowid: options.chatflowid,
            orgId: options.orgId
        })
    }
}

type AWSAgentCoreToolParams = ToolParams
type AWSAgentCoreToolInput = {
    name: string
    description: string
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
    region: string
    schema: any
    chatflowid: string
    orgId: string
}

export class AWSAgentCoreTool extends StructuredTool {
    static lc_name() {
        return 'AWSAgentCoreTool'
    }

    name = NAME

    description = DESC

    client: BedrockAgentCoreClient

    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
    region: string

    schema

    chatflowid: string

    orgId: string

    flowObj: ICommonObject

    constructor(options: AWSAgentCoreToolParams & AWSAgentCoreToolInput) {
        super(options)
        this.description = options.description
        this.name = options.name
        this.accessKeyId = options.accessKeyId
        this.secretAccessKey = options.secretAccessKey
        this.sessionToken = options.sessionToken
        this.region = options.region
        this.schema = options.schema
        this.chatflowid = options.chatflowid
        this.orgId = options.orgId

        // Initialize AWS AgentCore client
        const awsAgentcoreConfig: BedrockAgentCoreClientConfig = {
            region: this.region
        }

        if (this.accessKeyId && this.secretAccessKey) {
            awsAgentcoreConfig.credentials = {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
                ...(this.sessionToken && { sessionToken: this.sessionToken })
            }
        }

        this.client = new BedrockAgentCoreClient(awsAgentcoreConfig)
    }

    static async initialize(options: Partial<AWSAgentCoreToolParams> & AWSAgentCoreToolInput) {
        return new this({
            name: options.name,
            description: options.description,
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
            sessionToken: options.sessionToken,
            region: options.region,
            schema: options.schema,
            chatflowid: options.chatflowid,
            orgId: options.orgId
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
                const input: InvokeCodeInterpreterCommandInput = {
                    codeInterpreterIdentifier: 'aws.codeinterpreter.v1',
                    name: 'executeCode',
                    arguments: {
                        code: arg.input,
                        language: 'python'
                    }
                }

                const command = new InvokeCodeInterpreterCommand(input)
                const execution = await this.client.send(command)
                const sessionId = execution.sessionId

                let output = ''
                const artifacts: any[] = []

                if (!execution.stream) {
                    if (sessionId) {
                        const stopSessionCommand = new StopCodeInterpreterSessionCommand({
                            codeInterpreterIdentifier: 'aws.codeinterpreter.v1',
                            sessionId
                        })
                        await this.client.send(stopSessionCommand)
                    }
                    return output
                }

                for await (const chunk of execution.stream) {
                    // Process each chunk from the stream
                    if (chunk.result) {
                        console.log('chunk.result =', chunk.result)

                        // Process content blocks
                        if (chunk.result.content) {
                            console.log('chunk.resultcontent =', chunk.result.content)

                            for (const contentBlock of chunk.result.content) {
                                if (contentBlock.type === 'text' && contentBlock.text) {
                                    output += contentBlock.text
                                }
                                // TODO: Handle other content types that might contain images
                            }
                        }

                        // Process structured content (stdout/stderr)
                        if (!output && chunk.result.structuredContent) {
                            if (chunk.result.structuredContent.stdout) {
                                output += chunk.result.structuredContent.stdout
                            }
                            if (chunk.result.structuredContent.stderr) {
                                throw new Error(`Code execution error: ${chunk.result.structuredContent.stderr}`)
                            }
                        }
                    }

                    const err =
                        chunk.accessDeniedException ||
                        chunk.internalServerException ||
                        chunk.throttlingException ||
                        chunk.validationException ||
                        chunk.conflictException ||
                        chunk.resourceNotFoundException ||
                        chunk.serviceQuotaExceededException
                    if (err) {
                        if (sessionId) {
                            const stopSessionCommand = new StopCodeInterpreterSessionCommand({
                                codeInterpreterIdentifier: 'aws.codeinterpreter.v1',
                                sessionId
                            })
                            await this.client.send(stopSessionCommand)
                        }
                        throw new Error(`${err.name}: ${err.message}`)
                    }
                }

                // Clean up session
                if (sessionId) {
                    const stopSessionCommand = new StopCodeInterpreterSessionCommand({
                        codeInterpreterIdentifier: 'aws.codeinterpreter.v1',
                        sessionId
                    })
                    await this.client.send(stopSessionCommand)
                }

                return artifacts.length > 0 ? output + ARTIFACTS_PREFIX + JSON.stringify(artifacts) : output
            } else {
                return 'No input provided'
            }
        } catch (e) {
            return typeof e === 'string' ? e : JSON.stringify(e, null, 2)
        }
    }

    setFlowObject(flowObj: ICommonObject) {
        this.flowObj = flowObj
    }
}

module.exports = { nodeClass: Code_InterpreterAWS_Tools }
