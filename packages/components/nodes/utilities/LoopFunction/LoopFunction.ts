import { NodeVM } from '@flowiseai/nodevm'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, INodeOptionsValue, IVariable } from '../../../src/Interface'

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
        this.description = 'Execute condition check, with different outputs for condition met/not met'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
        this.inputs = [
            {
                label: 'Input Value',
                name: 'inputValue',
                type: 'string | number | json | array | file',
                description: 'Input value for condition check (can be any type of data)',
                placeholder: 'Enter value or connect to other nodes',
                acceptVariable: true,
                optional: true
            },
            {
                label: 'Success Condition',
                name: 'successCondition',
                type: 'code',
                rows: 4,
                description: 'JavaScript condition to determine if the result is successful. Return true for success, false for failure.',
                default: `// Check if the result meets your criteria
return true;`
            },
            {
                label: 'Loop Back Node',
                name: 'loopBackNode',
                type: 'string',
                description: 'Node ID to loop back to (automatically set when failure output is connected)',
                optional: true,
                hidden: true
            },
            {
                label: 'Connected Loop Input',
                name: 'connectedLoopInput',
                type: 'string',
                description: 'Currently connected Loop Input node',
                optional: true,
                placeholder: 'Not connected'
            }
        ]
        this.outputs = [
            {
                label: 'Success',
                name: 'success',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array', 'any'],
                description: 'Output when success condition is met',
                isAnchor: true
            },
            {
                label: 'Failure',
                name: 'failure',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array', 'any'],
                description: 'Output when success condition is not met',
                isAnchor: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listLoopInputNodes(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnOptions: INodeOptionsValue[] = []

            try {
                console.log('DEBUG - Options received:', options)
                const nodes = options.nodes || []
                console.log(
                    'DEBUG - Available nodes:',
                    nodes?.map((node: ICommonObject) => ({
                        id: node.id,
                        type: node.data?.type,
                        name: node.data?.name,
                        label: node.data?.label
                    }))
                )

                if (nodes && nodes.length > 0) {
                    for (const node of nodes) {
                        // 检查所有可能的标识符
                        if (node.data?.type === 'LoopInput' || node.data?.name === 'loopInput' || node.type === 'LoopInput') {
                            console.log('DEBUG - Found LoopInput node:', node.id)
                            returnOptions.push({
                                label: `${node.data?.label || 'Loop Input'} (${node.id})`,
                                name: node.id,
                                description: node.data?.label || 'Loop Input Node'
                            })
                        }
                    }
                }
            } catch (error) {
                console.error('Error in listLoopInputNodes:', error)
            }

            console.log('DEBUG - Return options:', returnOptions)
            return returnOptions
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject = {}): Promise<any> {
        const successCondition = nodeData.inputs?.successCondition as string
        const inputValue = nodeData.inputs?.inputValue
        const loopBackNode = nodeData.inputs?.loopBackNode as string

        if (!successCondition) throw new Error('Success condition is required')

        let variables: IVariable[] = []
        try {
            if (options?.appDataSource && options?.databaseEntities) {
                variables = await getVars(options.appDataSource, options.databaseEntities, nodeData)
            }
        } catch (error) {
            console.warn('Warning: Failed to get variables:', error)
        }

        const flow = {
            chatflowId: options?.chatflowid,
            sessionId: options?.sessionId,
            chatId: options?.chatId,
            input
        }

        let sandbox: any = {
            $input: inputValue || input,
            util: undefined,
            Symbol: undefined,
            child_process: undefined,
            fs: undefined,
            process: undefined
        }
        sandbox['$vars'] = prepareSandboxVars(variables)
        sandbox['$flow'] = flow

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
            // 检查成功条件
            sandbox.$output = sandbox.$input
            const isSuccess = await vm.run(`module.exports = async function() {${successCondition}}()`, __dirname)

            const result = {
                inputValue: sandbox.$input
            }

            // 如果条件失败且没有指定回流节点，抛出错误
            if (!isSuccess && !loopBackNode) {
                throw new Error('Loop back node is required for failure case')
            }

            // 如果条件失败，添加循环回流信息
            if (!isSuccess) {
                return {
                    failure: {
                        ...result,
                        nodeID: loopBackNode,
                        isLoop: true
                    },
                    isLoop: true
                }
            }

            // 成功时正常返回
            return {
                success: result
            }
        } catch (error) {
            throw new Error(`Error in condition execution: ${error.message}`)
        }
    }
}

module.exports = { nodeClass: LoopFunction_Utilities }
