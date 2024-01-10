import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { NodeVM } from 'vm2'
import { availableDependencies } from '../../../src/utils'

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

    async init(nodeData: INodeData, input: string): Promise<any> {
        const ifFunction = nodeData.inputs?.ifFunction as string
        const elseFunction = nodeData.inputs?.elseFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables

        let inputVars: ICommonObject = {}
        if (functionInputVariablesRaw) {
            try {
                inputVars =
                    typeof functionInputVariablesRaw === 'object' ? functionInputVariablesRaw : JSON.parse(functionInputVariablesRaw)
            } catch (exception) {
                throw new Error("Invalid JSON in the PromptTemplate's promptValues: " + exception)
            }
        }

        let sandbox: any = { $input: input }

        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                sandbox[`$${item}`] = inputVars[item]
            }
        }

        const defaultAllowBuiltInDep = [
            'assert',
            'buffer',
            'crypto',
            'events',
            'http',
            'https',
            'net',
            'path',
            'querystring',
            'timers',
            'tls',
            'url',
            'zlib'
        ]

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
