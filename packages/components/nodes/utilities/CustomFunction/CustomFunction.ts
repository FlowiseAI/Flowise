import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { NodeVM } from 'vm2'
import { DataSource } from 'typeorm'
import {
    availableDependencies,
    defaultAllowBuiltInDep,
    getUserHome,
    getVars,
    handleEscapeCharacters,
    prepareSandboxVars
} from '../../../src/utils'
import path from 'path'
import fs from 'fs'

export const getConfigFile = async (fileName: string): Promise<string> => {
    // read home .flowise filename
    const filePath = path.join(getUserHome(), '.flowise', fileName)
    try {
        return await fs.promises.readFile(filePath, 'utf8')
    } catch (error) {
        return ''
    }
}

class CustomFunction_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Custom JS Function'
        this.name = 'customFunction'
        this.version = 2.0
        this.type = 'CustomFunction'
        this.icon = 'customfunction.svg'
        this.category = 'Utilities'
        this.description = `Execute custom javascript function`
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
            },
            {
                label: 'Ending Node',
                name: 'EndingNode',
                baseClasses: [this.type]
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const isEndingNode = nodeData?.outputs?.output === 'EndingNode'
        if (isEndingNode && !options.isRun) return // prevent running both init and run twice

        const javascriptFunction = nodeData.inputs?.javascriptFunction as string
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
                console.error('Invalid JSON in the Custom Function Input Variables: ', exception, functionInputVariablesRaw)
                fs.writeFileSync('error.json', functionInputVariablesRaw)
                throw new Error('Invalid JSON in the Custom Function Input Variables: ' + exception)
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

        let sandbox: any = { $input: input }
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
            }
        } as any

        const vm = new NodeVM(nodeVMOptions)
        const customFunctions = await getConfigFile('custom_functions.js')
        try {
            const response = await vm.run(
                `${customFunctions}
            module.exports = async function() {${javascriptFunction}}()`,
                __dirname
            )

            if (typeof response === 'string' && !isEndingNode) {
                return handleEscapeCharacters(response, false)
            }
            return response
        } catch (e) {
            throw new Error(e.message ?? e)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        return await this.init(nodeData, input, { ...options, isRun: true })
    }
}

module.exports = { nodeClass: CustomFunction_Utilities }
