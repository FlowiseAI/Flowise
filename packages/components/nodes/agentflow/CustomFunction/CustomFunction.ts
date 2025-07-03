import { DataSource } from 'typeorm'
import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IServerSideEventStreamer
} from '../../../src/Interface'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../../src/utils'
import { NodeVM } from '@flowiseai/nodevm'
import { updateFlowState } from '../utils'

interface ICustomFunctionInputVariables {
    variableName: string
    variableValue: string
}

const exampleFunc = `/*
* You can use any libraries imported in Flowise
* You can use properties specified in Input Schema as variables. Ex: Property = userid, Variable = $userid
* You can get default flow config: $flow.sessionId, $flow.chatId, $flow.chatflowId, $flow.input, $flow.state
* You can get custom variables: $vars.<variable-name>
* Must return a string value at the end of function
*/

const fetch = require('node-fetch');
const url = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true';
const options = {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};
try {
    const response = await fetch(url, options);
    const text = await response.text();
    return text;
} catch (error) {
    console.error(error);
    return '';
}`

class CustomFunction_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideOutput: boolean
    hint: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Custom Function'
        this.name = 'customFunctionAgentflow'
        this.version = 1.0
        this.type = 'CustomFunction'
        this.category = 'Agent Flows'
        this.description = 'Execute custom function'
        this.baseClasses = [this.type]
        this.color = '#E4B7FF'
        this.inputs = [
            {
                label: 'Input Variables',
                name: 'customFunctionInputVariables',
                description: 'Input variables can be used in the function with prefix $. For example: $foo',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Variable Name',
                        name: 'variableName',
                        type: 'string'
                    },
                    {
                        label: 'Variable Value',
                        name: 'variableValue',
                        type: 'string',
                        acceptVariable: true
                    }
                ]
            },
            {
                label: 'Javascript Function',
                name: 'customFunctionJavascriptFunction',
                type: 'code',
                codeExample: exampleFunc,
                description: 'The function to execute. Must return a string or an object that can be converted to a string.'
            },
            {
                label: 'Update Flow State',
                name: 'customFunctionUpdateState',
                description: 'Update runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'asyncOptions',
                        loadMethod: 'listRuntimeStateKeys',
                        freeSolo: true
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        acceptVariable: true,
                        acceptNodeOutputAsVariable: true
                    }
                ]
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const javascriptFunction = nodeData.inputs?.customFunctionJavascriptFunction as string
        const functionInputVariables = nodeData.inputs?.customFunctionInputVariables as ICustomFunctionInputVariables[]
        const _customFunctionUpdateState = nodeData.inputs?.customFunctionUpdateState

        const state = options.agentflowRuntime?.state as ICommonObject
        const chatId = options.chatId as string
        const isLastNode = options.isLastNode as boolean
        const isStreamable = isLastNode && options.sseStreamer !== undefined

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

        // Update flow state if needed
        let newState = { ...state }
        if (_customFunctionUpdateState && Array.isArray(_customFunctionUpdateState) && _customFunctionUpdateState.length > 0) {
            newState = updateFlowState(state, _customFunctionUpdateState)
        }

        const variables = await getVars(appDataSource, databaseEntities, nodeData)
        const flow = {
            chatflowId: options.chatflowid,
            sessionId: options.sessionId,
            chatId: options.chatId,
            input
        }

        let sandbox: any = {
            $input: input,
            util: undefined,
            Symbol: undefined,
            child_process: undefined,
            fs: undefined,
            process: undefined
        }
        sandbox['$vars'] = prepareSandboxVars(variables)
        sandbox['$flow'] = flow

        for (const item of functionInputVariables) {
            const variableName = item.variableName
            const variableValue = item.variableValue
            sandbox[`$${variableName}`] = variableValue
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
        try {
            const response = await vm.run(`module.exports = async function() {${javascriptFunction}}()`, __dirname)

            let finalOutput = response
            if (typeof response === 'object') {
                finalOutput = JSON.stringify(response, null, 2)
            }

            if (isStreamable) {
                const sseStreamer: IServerSideEventStreamer = options.sseStreamer
                sseStreamer.streamTokenEvent(chatId, finalOutput)
            }

            // Process template variables in state
            if (newState && Object.keys(newState).length > 0) {
                for (const key in newState) {
                    if (newState[key].toString().includes('{{ output }}')) {
                        newState[key] = finalOutput
                    }
                }
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    inputVariables: functionInputVariables,
                    code: javascriptFunction
                },
                output: {
                    content: finalOutput
                },
                state: newState
            }

            return returnOutput
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CustomFunction_Agentflow }
