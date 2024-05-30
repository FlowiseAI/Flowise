/* 
* TODO: Implement codeInterpreter column to chat_message table
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { CodeInterpreter } from '@e2b/code-interpreter'
import { z } from 'zod'

const DESC = `Evaluates python code in a sandbox environment. \
The environment is long running and exists across multiple executions. \
You must send the whole script every time and print your outputs. \
Script should be pure python code that can be evaluated. \
It should be in python format NOT markdown. \
The code should NOT be wrapped in backticks. \
All python packages including requests, matplotlib, scipy, numpy, pandas, \
etc are available. Create and display chart using "plt.show()".`
const NAME = 'code_interpreter'

class E2B_Tools implements INode {
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
        this.label = 'E2B'
        this.name = 'e2b'
        this.version = 1.0
        this.type = 'E2B'
        this.icon = 'e2b.png'
        this.category = 'Tools'
        this.badge = 'NEW'
        this.description = 'Execute code in E2B Code Intepreter'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(E2BTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['E2BApi']
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
        const socketIO = options.socketIO
        const socketIOClientId = options.socketIOClientId

        return await E2BTool.initialize({
            description: toolDesc ?? DESC,
            name: toolName ?? NAME,
            apiKey: e2bApiKey,
            schema: z.object({
                input: z.string().describe('Python code to be executed in the sandbox environment')
            }),
            socketIO,
            socketIOClientId
        })
    }
}

type E2BToolParams = ToolParams & { instance: CodeInterpreter }

export class E2BTool extends StructuredTool {
    static lc_name() {
        return 'E2BTool'
    }

    name = NAME

    description = DESC

    instance: CodeInterpreter

    apiKey: string

    schema

    socketIO

    socketIOClientId = ''

    constructor(options: E2BToolParams & { name: string; description: string, apiKey: string, schema: any, socketIO: any, socketIOClientId: string}) {
        super(options)
        this.instance = options.instance
        this.description = options.description
        this.name = options.name
        this.apiKey = options.apiKey
        this.schema = options.schema
        this.returnDirect = true
        this.socketIO = options.socketIO
        this.socketIOClientId = options.socketIOClientId
    }

    static async initialize(options: Partial<E2BToolParams> & { name: string; description: string, apiKey: string, schema: any, socketIO: any, socketIOClientId: string }) {
        const instance = await CodeInterpreter.create({ apiKey: options.apiKey })
        return new this({ instance, name: options.name, description: options.description, apiKey: options.apiKey, schema: options.schema, socketIO: options.socketIO, socketIOClientId: options.socketIOClientId})
    }

    async _call(args: any) {
        try {
            if ('input' in args) {
                const execution = await this.instance.notebook.execCell(args?.input)
                let imgHTML = ''
                for (const result of execution.results) {
                    if (result.png) {
                        imgHTML += `\n\n<img src="data:image/png;base64,${result.png}" width="100%" height="max-content" alt="image" /><br/>`
                    }
                    if (result.jpeg) {
                        imgHTML += `\n\n<img src="data:image/jpeg;base64,${result.jpeg}" width="100%" height="max-content" alt="image" /><br/>`
                    }
                }
                const output = execution.text ? execution.text + imgHTML : imgHTML
                if (this.socketIO && this.socketIOClientId) this.socketIO.to(this.socketIOClientId).emit('token', output)
                return output
            } else {
                return 'No input provided'
            }
        } catch (e) {
            return typeof e === 'string' ? e : JSON.stringify(e, null, 2)
        }
    }
}

module.exports = { nodeClass: E2B_Tools }
*/
