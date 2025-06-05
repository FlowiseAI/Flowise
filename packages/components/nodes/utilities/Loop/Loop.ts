import { NodeVM } from '@flowiseai/nodevm'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, INodeOptionsValue, IVariable } from '../../../src/Interface'

interface IFlowNode extends INode {
    id?: string
    type: string
    previousResult?: any
    data?: {
        type?: string
        label?: string
        name?: string
        version?: number
        icon?: string
        category?: string
        description?: string
        baseClasses?: string[]
        tags?: string[]
        inputs?: INodeParams[]
        outputs?: INodeOutputsValue[]
        filePath?: string
        inputAnchors?: string[]
        inputParams?: any
        outputAnchors?: string[]
        id?: string
        position?: any
        positionAbsolute?: any
        isInLoop?: boolean
    }
}

interface IFlowEdge {
    id?: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
}

class Loop implements INode {
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
        this.label = 'loop'
        this.name = 'loop'
        this.version = 1.0
        this.type = 'loop'
        this.icon = 'loop.svg'
        this.category = 'Loop'
        this.description = 'Execute condition check, with different outputs for condition met/not met'
        this.baseClasses = [this.type, 'Loop']
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
            },
            {
                label: 'Inner Nodes',
                name: 'innerNodes',
                type: 'string[]',
                description: 'Inner nodes in the loop',
                optional: true
            },
            {
                label: 'Inner Edges',
                name: 'innerEdges',
                type: 'string[]',
                description: 'Inner edges in the loop',
                optional: true
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

    /**
     * 根据边的连接关系构建节点执行链
     */
    private buildNodeChain(nodes: IFlowNode[], edges: IFlowEdge[]): IFlowNode[] {
        // 构建节点映射
        const nodeMap = new Map<string, IFlowNode>()
        nodes.forEach((node) => {
            nodeMap.set(node.id!, node)
        })

        // 构建连接关系图
        const connections = new Map<string, Set<string>>()
        edges.forEach((edge) => {
            if (!connections.has(edge.source)) {
                connections.set(edge.source, new Set())
            }
            connections.get(edge.source)!.add(edge.target)
        })

        // 找到开始节点（startFunction）
        const startNode = nodes.find((node) => {
            return node?.data?.type === 'StartFunction'
        })
        if (!startNode) {
            throw new Error('Start node not found in inner flow')
        }

        // 构建执行链
        const executionChain: IFlowNode[] = []
        const visited = new Set<string>()

        const buildChain = (currentNodeId: string) => {
            if (visited.has(currentNodeId)) return
            visited.add(currentNodeId)

            const currentNode = nodeMap.get(currentNodeId)
            if (currentNode) {
                executionChain.push(currentNode)

                // 获取下一个连接的节点
                const nextNodeIds = connections.get(currentNodeId) || new Set()
                for (const nextNodeId of nextNodeIds) {
                    const nextNode = nodeMap.get(nextNodeId)
                    if (nextNode) {
                        // 优先处理 endFunction
                        if (nextNode.type === 'endFunction') {
                            buildChain(nextNodeId)
                        }
                    }
                }

                // 处理其他连接的节点
                for (const nextNodeId of nextNodeIds) {
                    const nextNode = nodeMap.get(nextNodeId)
                    if (nextNode && nextNode.type !== 'endFunction') {
                        buildChain(nextNodeId)
                    }
                }
            }
        }

        // 从开始节点构建链
        buildChain(startNode.id!)

        // 确保所有节点都被访问到
        const unvisitedNodes = nodes.filter((node) => !visited.has(node.id!))
        if (unvisitedNodes.length > 0) {
            console.warn(
                'Warning: Some nodes are not connected:',
                unvisitedNodes.map((n) => n.id)
            )
        }

        return executionChain
    }

    /**
     * 执行内部流程的节点链
     */
    private async executeNodeChain(nodes: IFlowNode[], initialInput: any, options: ICommonObject = {}): Promise<any> {
        let currentResult = initialInput
        let finalResult = null

        for (const node of nodes) {
            try {
                // 准备节点数据
                const nodeData = {
                    id: node.id,
                    ...node.data,
                    inputs: {
                        ...(node.data?.inputs || {}),
                        inputValue: currentResult,
                        ...currentResult
                    }
                }

                // 获取节点实例
                if (!node.data?.filePath) {
                    throw new Error(`Node ${node.data?.type} missing filePath`)
                }
                const nodeModule = await import(node.data.filePath)
                const nodeInstance = new nodeModule.nodeClass()

                // 执行节点
                const result = await nodeInstance.init(nodeData, currentResult, options)
                node.previousResult = result
                currentResult = result

                // 如果是 EndFunction，保存最终结果
                if (node.data?.type === 'EndFunction') {
                    finalResult = result
                }
            } catch (error) {
                console.error(`Error executing node ${node.data?.type}:`, error)
                throw error
            }
        }

        return finalResult
    }

    async init(
        nodeData: INodeData & { flowData?: { innerNodes?: IFlowNode[]; innerEdges?: IFlowEdge[] } },
        input: string,
        options: ICommonObject = {}
    ): Promise<any> {
        const successCondition = nodeData.inputs?.successCondition as string
        const inputValue = nodeData.inputs?.inputValue
        const innerNodes = nodeData.flowData?.innerNodes || []
        const innerEdges = nodeData.flowData?.innerEdges || []
        const MAX_ITERATIONS = 100

        if (!successCondition) throw new Error('Success condition is required')

        // 构建节点执行链
        const executionChain = this.buildNodeChain(innerNodes, innerEdges)
        let currentInput = inputValue
        let iterationCount = 0
        let result
        let isSuccess = false
        let debugHistory: any[] = []

        // 循环执行直到成功或达到最大迭代次数
        while (!isSuccess && iterationCount < MAX_ITERATIONS) {
            iterationCount++

            // 执行节点链
            result = await this.executeNodeChain(executionChain, currentInput, options)

            // 输出调试信息到网页
            const debugInfo = {
                iteration: iterationCount,
                condition: successCondition,
                input: currentInput,
                output: result,
                timestamp: new Date().toISOString()
            }

            // 添加到调试历史
            debugHistory.push(debugInfo)

            // 发送 WebSocket 消息
            const wsManager = nodeData.options?.wsManager
            if (wsManager && typeof wsManager.sendMessage === 'function' && nodeData.options?.chatflowid) {
                try {
                    wsManager.sendMessage(nodeData.options.chatflowid, {
                        type: 'loopIteration',
                        data: debugHistory
                    })
                } catch (error) {
                    console.warn('Error sending WebSocket message:', error)
                }
            } else {
                console.warn('WebSocket service not available, sendMessage not a function, or chatflowid missing')
            }

            let variables: IVariable[] = []
            try {
                if (options?.appDataSource && options?.databaseEntities) {
                    variables = await getVars(options.appDataSource, options.databaseEntities, nodeData)
                }
            } catch (error) {
                console.warn('Warning: Failed to get variables:', error)
            }

            // 创建内部流程的配置
            const innerFlowConfig = {
                nodes: executionChain,
                edges: innerEdges,
                parentNodeId: nodeData.id,
                result,
                iterationCount
            }

            let sandbox: any = {
                $input: result || currentInput,
                $innerFlow: innerFlowConfig,
                util: undefined,
                Symbol: undefined,
                child_process: undefined,
                fs: undefined,
                process: undefined
            }
            sandbox['$vars'] = prepareSandboxVars(variables)
            sandbox['$flow'] = {
                ...options,
                result
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
                // 检查成功条件
                sandbox.$output = sandbox.$input
                isSuccess = await vm.run(`module.exports = async function() {${successCondition}}()`, __dirname)

                // 如果成功，返回最终结果
                if (isSuccess) {
                    return {
                        success: {
                            inputValue: sandbox.$input,
                            ...result,
                            innerFlowResult: result,
                            iterationCount
                        }
                    }
                }

                // 更新下一次迭代的输入
                currentInput = result
            } catch (error) {
                throw new Error(`Error in condition execution: ${error.message}`)
            }
        }

        // 如果达到最大迭代次数仍未成功
        if (iterationCount >= MAX_ITERATIONS) {
            throw new Error(`Loop execution exceeded maximum iterations (${MAX_ITERATIONS})`)
        }

        // 如果执行失败，返回失败状态
        return {
            failure: {
                inputValue: currentInput,
                ...currentInput,
                innerFlowResult: result,
                iterationCount
            }
        }
    }
}

module.exports = { nodeClass: Loop }
