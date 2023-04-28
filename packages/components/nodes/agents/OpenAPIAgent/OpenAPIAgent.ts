import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { AgentExecutor } from 'langchain/agents'
import { getBaseClasses } from '../../../src/utils'
import * as yaml from 'js-yaml'
import { OpenAI } from 'langchain/llms/openai'
import { JsonSpec, JsonObject } from 'langchain/tools'
import { createOpenApiAgent, OpenApiToolkit } from 'langchain/agents'

class OpenAPIAgent_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAPI Agent'
        this.name = 'openAPIAgent'
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'openapi.svg'
        this.description = 'Conversational agent for a chat model. It will utilize chat specific prompts'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'YAML File',
                name: 'yamlFile',
                type: 'string',
                placeholder: 'https://github.com/openai/openai-openapi/blob/master/openapi.yaml'
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'string',
                rows: 4,
                default: `{
    "Content-Type": "application/json",
}`,
                placeholder: `{
    "Content-Type": "application/json",
    "Authorization": "Bearer <api-key>",
}`
            },
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        /*
        const model = nodeData.inputs?.model as BaseChatModel
        const tools = nodeData.inputs?.tools as Tool[]
        const memory = nodeData.inputs?.memory as BaseChatMemory
        const humanMessage = nodeData.inputs?.humanMessage as string
        const systemMessage = nodeData.inputs?.systemMessage as string

        const obj: InitializeAgentExecutorOptions = {
            agentType: 'chat-conversational-react-description',
            verbose: true
        }

        const agentArgs: any = {}
        if (humanMessage) {
            agentArgs.humanMessage = humanMessage
        }
        if (systemMessage) {
            agentArgs.systemMessage = systemMessage
        }

        if (Object.keys(agentArgs).length) obj.agentArgs = agentArgs

        const executor = await initializeAgentExecutorWithOptions(tools, model, obj)
        executor.memory = memory
        return executor*/
        return null
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        let data: JsonObject
        try {
            // const yamlFile = fs.readFileSync("openai_openapi.yaml", "utf8");
            data = yaml.load('https://github.com/openai/openai-openapi/blob/master/openapi.yaml') as JsonObject
            if (!data) {
                throw new Error('Failed to load OpenAPI spec')
            }
        } catch (e) {
            console.error(e)
            return ''
        }

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer `
        }
        const model = new OpenAI({ temperature: 0 })
        const toolkit = new OpenApiToolkit(new JsonSpec(data), model, headers)
        const executor = createOpenApiAgent(model, toolkit)

        const result = await executor.call({ input })
        console.log(`Got output ${result.output}`)

        return result?.output
    }
}

module.exports = { nodeClass: OpenAPIAgent_Agents }
