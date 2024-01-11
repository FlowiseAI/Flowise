import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { NodeVM } from 'vm2'
import { availableDependencies, handleEscapeCharacters } from '../../../src/utils'

class CustomFunction_Utilities implements INode {
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
        this.label = 'Custom JS Function'
        this.name = 'customFunction'
        this.version = 1.0
        this.type = 'CustomFunction'
        this.icon = 'customfunction.svg'
        this.category = 'Utilities'
        this.description = `Execute custom javascript function`
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
                label: 'Function Name',
                name: 'functionName',
                type: 'string',
                optional: true,
                placeholder: 'My Function'
            },
            {
                label: 'Javascript Function',
                name: 'javascriptFunction',
                type: 'code'
            }
        ]
        this.outputs = [
            {
                label: 'Output',
                name: 'output',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array']
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const javascriptFunction = nodeData.inputs?.javascriptFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables

        let inputVars: ICommonObject = {}
        if (functionInputVariablesRaw) {
            try {
                inputVars =
                    typeof functionInputVariablesRaw === 'object' ? functionInputVariablesRaw : JSON.parse(functionInputVariablesRaw)
            } catch (exception) {
                throw new Error('Invalid JSON in the Custom Function Input Variables: ' + exception)
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
            const response = await vm.run(`module.exports = async function() {${javascriptFunction}}()`, __dirname)
            if (typeof response === 'string') {
                return handleEscapeCharacters(response, false)
            }
            return response
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CustomFunction_Utilities }
