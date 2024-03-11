import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { NodeVM } from 'vm2'
import { DataSource } from 'typeorm'
import { availableDependencies, defaultAllowBuiltInDep, getVars, handleEscapeCharacters, prepareSandboxVars } from '../../../src/utils'

class IfElseFunction_Utilities implements INode {
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
        this.label = 'IfElse Function'
        this.name = 'ifElseFunction'
        this.version = 1.0
        this.type = 'IfElseFunction'
        this.icon = 'ifelsefunction.svg'
        this.category = 'Utilities'
        this.description = `Split flows based on If Else javascript functions`
        this.baseClasses = [this.type, 'Utilities']
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
                label: 'IfElse Name',
                name: 'functionName',
                type: 'string',
                optional: true,
                placeholder: 'If Condition Match'
            },
            {
                label: 'If Function',
                name: 'ifFunction',
                description: 'Function must return a value',
                type: 'code',
                rows: 2,
                default: `if ("hello" == "hello") {
    return true;
}`
            },
            {
                label: 'Else Function',
                name: 'elseFunction',
                description: 'Function must return a value',
                type: 'code',
                rows: 2,
                default: `return false;`
            }
        ]
        this.outputs = [
            {
                label: 'True',
                name: 'returnTrue',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array']
            },
            {
                label: 'False',
                name: 'returnFalse',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const ifFunction = nodeData.inputs?.ifFunction as string
        const elseFunction = nodeData.inputs?.elseFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

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
                throw new Error("Invalid JSON in the IfElse's Input Variables: " + exception)
            }
        }

        // Some values might be a stringified JSON, parse it
        for (const key in inputVars) {
            if (typeof inputVars[key] === 'string' && inputVars[key].startsWith('{') && inputVars[key].endsWith('}')) {
                try {
                    inputVars[key] = JSON.parse(inputVars[key])
                } catch (e) {
                    continue
                }
            }
        }

        let sandbox: any = { $input: input }
        sandbox['$vars'] = prepareSandboxVars(variables)
        sandbox['$flow'] = flow

        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                let value = inputVars[item]
                if (typeof value === 'string') {
                    value = handleEscapeCharacters(value, true)
                }
                sandbox[`$${item}`] = value
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
            }
        } as any

        const vm = new NodeVM(nodeVMOptions)
        try {
            const responseTrue = await vm.run(`module.exports = async function() {${ifFunction}}()`, __dirname)
            if (responseTrue) return { output: responseTrue, type: true }

            const responseFalse = await vm.run(`module.exports = async function() {${elseFunction}}()`, __dirname)
            return { output: responseFalse, type: false }
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: IfElseFunction_Utilities }
