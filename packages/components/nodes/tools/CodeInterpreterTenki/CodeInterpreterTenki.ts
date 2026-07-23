import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { TenkiSandbox, Session } from '@tenkicloud/sandbox'
import { z } from 'zod/v3'

const DESC = `Evaluates python code in a sandbox environment. \
You must send the whole self-contained script every time and print your outputs. \
Script should be pure python code that can be evaluated. \
It should be in python format NOT markdown. \
The code should NOT be wrapped in backticks.`
const NAME = 'code_interpreter'

class Code_Interpreter_Tenki_Tools implements INode {
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
        this.label = 'Code Interpreter by Tenki'
        this.name = 'codeInterpreterTenki'
        this.version = 1.0
        this.type = 'CodeInterpreter'
        this.icon = 'tenki.svg'
        this.category = 'Tools'
        this.description = 'Execute code in a Tenki sandbox environment'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(TenkiTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['tenkiApi']
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
        const tenkiApiKey = getCredentialParam('tenkiApiKey', credentialData, nodeData)

        return await TenkiTool.initialize({
            description: toolDesc ?? DESC,
            name: toolName ?? NAME,
            apiKey: tenkiApiKey,
            schema: z.object({
                input: z.string().describe('Python code to be executed in the sandbox environment')
            })
        })
    }
}

type TenkiToolParams = ToolParams
type TenkiToolInput = {
    name: string
    description: string
    apiKey: string
    schema: any
}

export class TenkiTool extends StructuredTool {
    static lc_name() {
        return 'TenkiTool'
    }

    name = NAME
    description = DESC
    apiKey: string
    schema

    constructor(options: TenkiToolParams & TenkiToolInput) {
        super(options)
        this.description = options.description
        this.name = options.name
        this.apiKey = options.apiKey
        this.schema = options.schema
    }

    static async initialize(options: Partial<TenkiToolParams> & TenkiToolInput) {
        return new this({
            name: options.name,
            description: options.description,
            apiKey: options.apiKey,
            schema: options.schema
        })
    }

    // @ts-ignore
    protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
        if (!arg || !('input' in arg)) {
            return 'No input provided'
        }

        let session: Session | undefined
        try {
            const sandbox = new TenkiSandbox({ authToken: this.apiKey })
            session = await sandbox.create({ cpuCores: 1, memoryMb: 2048 })

            const result = await session.run(['python3', '-c', arg.input as string])

            const stdout = new TextDecoder().decode(result.stdout).trim()
            const stderr = new TextDecoder().decode(result.stderr).trim()

            if (result.exitCode !== 0) {
                return stderr || stdout || `Execution failed with exit code ${result.exitCode}`
            }
            return stdout || stderr || '(no output)'
        } catch (e) {
            return typeof e === 'string' ? e : JSON.stringify(e, null, 2)
        } finally {
            if (session) await session.close()
        }
    }
}

module.exports = { nodeClass: Code_Interpreter_Tenki_Tools }
