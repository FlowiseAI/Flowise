import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { Tool, ToolParams } from '@langchain/core/tools'
import * as path from 'path'
import { getUserHome } from '../../../src/utils'

let pyodideInstance: PyodideInterface | undefined
const DESC = `Evaluates python code in a sandbox environment. The environment resets on every execution. You must send the whole script every time and print your outputs. Script should be pure python code that can be evaluated. Use only packages available in Pyodide.`
const NAME = 'python_interpreter'

async function LoadPyodide(): Promise<PyodideInterface> {
    if (pyodideInstance === undefined) {
        const obj = { packageCacheDir: path.join(getUserHome(), '.flowise', 'pyodideCacheDir') }
        pyodideInstance = await loadPyodide(obj)
    }
    return pyodideInstance
}

class PythonInterpreter_Tools implements INode {
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

    constructor() {
        this.label = 'Python Interpreter'
        this.name = 'pythonInterpreter'
        this.version = 1.0
        this.type = 'PythonInterpreter'
        this.icon = 'python.svg'
        this.category = 'Tools'
        this.badge = 'NEW'
        this.description = 'Execute python code in Pyodide sandbox environment'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(PythonInterpreterTool)]
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Specify the name of the tool',
                default: 'python_interpreter'
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

    async init(nodeData: INodeData): Promise<any> {
        const toolDesc = nodeData.inputs?.toolDesc as string
        const toolName = nodeData.inputs?.toolName as string

        return await PythonInterpreterTool.initialize({
            description: toolDesc ?? DESC,
            name: toolName ?? NAME
        })
    }
}

type PythonInterpreterToolParams = Parameters<typeof loadPyodide>[0] &
    ToolParams & {
        instance: PyodideInterface
    }

export class PythonInterpreterTool extends Tool {
    static lc_name() {
        return 'PythonInterpreterTool'
    }

    name = NAME

    description = DESC

    pyodideInstance: PyodideInterface

    stdout = ''

    stderr = ''

    constructor(options: PythonInterpreterToolParams & { name: string; description: string }) {
        super(options)
        this.description = options.description
        this.name = options.name
        this.pyodideInstance = options.instance
        this.pyodideInstance.setStderr({
            batched: (text: string) => {
                this.stderr += text
            }
        })
        this.pyodideInstance.setStdout({
            batched: (text: string) => {
                this.stdout += text
            }
        })
    }

    static async initialize(options: Partial<PythonInterpreterToolParams> & { name: string; description: string }) {
        const instance = await LoadPyodide()
        return new this({ instance, name: options.name, description: options.description })
    }

    async _call(script: string) {
        this.stdout = ''
        this.stderr = ''

        try {
            await this.pyodideInstance.loadPackagesFromImports(script)
            await this.pyodideInstance.runPythonAsync(script)
            return JSON.stringify({ stdout: this.stdout, stderr: this.stderr }, null, 2)
        } catch (e) {
            return typeof e === 'string' ? e : JSON.stringify(e, null, 2)
        }
    }
}

module.exports = { nodeClass: PythonInterpreter_Tools }
