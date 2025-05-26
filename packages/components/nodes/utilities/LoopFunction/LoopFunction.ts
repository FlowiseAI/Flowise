import { NodeVM } from '@flowiseai/nodevm'
import { DataSource } from 'typeorm'
import { availableDependencies, defaultAllowBuiltInDep, getVars, handleEscapeCharacters, prepareSandboxVars } from '../../../src/utils'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class LoopFunction_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Loop Function'
        this.name = 'loopFunction'
        this.version = 1.0
        this.type = 'LoopFunction'
        this.icon = 'loop.svg'
        this.category = 'Utilities'
        this.description = 'Execute a loop with condition check and max iterations'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
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
                label: 'Input Value',
                name: 'inputValue',
                type: 'string',
                description: 'Input value for the loop (can be string or number)',
                placeholder: 'Enter value or connect to other nodes',
                acceptVariable: true,
                optional: true
            },
            {
                label: 'Max Iterations',
                name: 'maxIterations',
                type: 'number',
                description: 'Maximum number of iterations (optional)',
                optional: true,
                default: 100
            },
            {
                label: 'Loop Condition',
                name: 'loopCondition',
                type: 'code',
                rows: 4,
                description: 'JavaScript condition to determine if loop should continue. Return true to continue, false to stop.',
                default: `if (iteration < 5) {
    return true;
}`
            },
            {
                label: 'Loop Body',
                name: 'loopBody',
                type: 'code',
                rows: 4,
                description: 'JavaScript code to execute in each iteration.',
                default: `return {
    message: \`Processing iteration \${iteration}\`,
    data: $input
}`
            }
        ]
        this.outputs = [
            {
                label: 'Output',
                name: 'output',
                baseClasses: ['string', 'number', 'json', 'array'],
                description: 'The final output after loop execution'
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const maxIterations = (nodeData.inputs?.maxIterations as number) || 100
        const loopCondition = nodeData.inputs?.loopCondition as string
        const loopBody = nodeData.inputs?.loopBody as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables
        const inputValue = nodeData.inputs?.inputValue
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

        if (!loopCondition) throw new Error('Loop condition is required')
        if (!loopBody) throw new Error('Loop body is required')

        const variables = await getVars(appDataSource, databaseEntities, nodeData)
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
                throw new Error("Invalid JSON in the Loop's Input Variables: " + exception)
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

        let sandbox: any = {
            $input: inputValue || input,
            iteration: 0,
            util: undefined,
            Symbol: undefined,
            child_process: undefined,
            fs: undefined,
            process: undefined
        }
        sandbox['$vars'] = prepareSandboxVars(variables)
        sandbox['$flow'] = flow

        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                sandbox[`$${item}`] = inputVars[item]
            }
        }

        const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
            ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
            : defaultAllowBuiltInDep
        const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
        const deps = availableDependencies.concat(externalDeps)

        const nodeVMOptions = {
            console: 'inherit',
            sandbox,
            require: {
                external: { modules: deps },
                builtin: builtinDeps
            },
            eval: false,
            wasm: false,
            timeout: 10000
        } as any

        const vm = new NodeVM(nodeVMOptions)
        let iteration = 0
        let prevOutput = inputValue || input
        let output = null

        try {
            while (iteration < maxIterations) {
                sandbox.iteration = iteration
                sandbox.$input = prevOutput

                // Check loop condition
                const shouldContinue = await vm.run(`module.exports = async function() {${loopCondition}}()`, __dirname)
                if (!shouldContinue) break

                // Execute loop body
                output = await vm.run(`module.exports = async function() {${loopBody}}()`, __dirname)
                prevOutput = output
                iteration++
            }

            return {
                output: {
                    iterations: iteration,
                    finalOutput: typeof output === 'string' ? handleEscapeCharacters(output, false) : output
                }
            }
        } catch (error) {
            throw new Error(`Error in loop execution: ${error.message}`)
        }
    }
}

module.exports = { nodeClass: LoopFunction_Utilities }
