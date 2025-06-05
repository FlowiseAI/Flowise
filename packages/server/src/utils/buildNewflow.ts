import { Request } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { INode, INodeData as IBaseNodeData, ICommonObject, INodeParams, INodeOutputsValue } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import logger from './logger'
import chatflowsService from '../services/chatflows'
import { getRunningExpressApp } from './getRunningExpressApp'
import { Variable } from '../database/entities/Variable'
import { getAPIOverrideConfig } from '../utils'
import { WebSocketManager } from './WebSocketManager'

interface IFlowExecutionResult extends ICommonObject {
    status: string
    executionTime: number
    tokenCount: number
    chatId?: string
    results: Array<{
        nodeName: string
        result: any
    }>
}

interface IExtendedNodeData extends IBaseNodeData {
    inputs: Record<string, any>
    flowData: {
        innerNodes?: IFlowNode[]
        innerEdges?: IFlowEdge[]
    }
}

interface IFlowNode extends INode {
    flowId?: string
    id?: string
    previousResult?: any
    nextNode?: IFlowNode
    name: string
    type: string
    icon: string
    version: number
    category: string
    baseClasses: string[]
    description?: string
    credential?: INodeParams
    inputs?: INodeParams[]
    output?: INodeOutputsValue[]
    init: (nodeData: IExtendedNodeData, input?: any) => Promise<any>
    flowData?: {
        innerNodes?: IFlowNode[]
        innerEdges?: IFlowEdge[]
    }
    options?: any
}

interface IFlowEdge {
    id?: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
}

class FlowManager {
    private nodes: Map<string, IFlowNode>
    private flowId: string
    private startNode: IFlowNode | null
    private currentNode: IFlowNode | null
    private startTime: number
    private edges: IFlowEdge[]
    private nodeConnections: Map<string, string[]>
    private nodeIdMap: Map<string, IFlowNode>

    constructor() {
        this.nodes = new Map()
        this.flowId = uuidv4()
        this.startNode = null
        this.currentNode = null
        this.startTime = Date.now()
        this.edges = []
        this.nodeConnections = new Map()
        this.nodeIdMap = new Map()
    }

    /**
     * 添加边到流程
     */
    addEdges(edges: IFlowEdge[]) {
        this.edges = edges
        // 构建节点连接关系图
        this.nodeConnections.clear()
        edges.forEach((edge) => {
            if (!this.nodeConnections.has(edge.source)) {
                this.nodeConnections.set(edge.source, [])
            }
            this.nodeConnections.get(edge.source)?.push(edge.target)
        })
    }

    /**
     * 添加节点到流程
     */
    addNode(node: IFlowNode & { id?: string }): void {
        if (!node || typeof node !== 'object') {
            throw new Error('Invalid node object')
        }

        if (!node.name || typeof node.name !== 'string' || node.name.trim() === '') {
            throw new Error('Node must have a valid non-empty name')
        }

        if (!node.type || typeof node.type !== 'string' || node.type.trim() === '') {
            throw new Error(`Node ${node.name} must have a valid type`)
        }

        if (!node.init || typeof node.init !== 'function') {
            throw new Error(`Node ${node.name} must have an init function`)
        }

        node.flowId = this.flowId
        this.nodes.set(node.name, node)

        // 保存节点ID到节点的映射
        if (node.id) {
            this.nodeIdMap.set(node.id, node)
        }

        // 如果是开始节点，设置为起始节点
        if (node.name === 'startFunction' || (!this.startNode && this.nodes.size === 1)) {
            this.startNode = node
        }
    }

    /**
     * 初始化节点
     */
    private async initializeNode(node: IFlowNode, nodeData: IExtendedNodeData, input?: any): Promise<any> {
        try {
            if (!node || !node.init || typeof node.init !== 'function') {
                throw new Error(`Invalid node or missing init function for node: ${node?.name || 'unknown'}`)
            }

            // 验证节点数据的完整性
            if (!nodeData || typeof nodeData !== 'object') {
                throw new Error(`Invalid node data for node: ${node.name}`)
            }

            // 确保 inputs 对象存在
            nodeData.inputs = nodeData.inputs || {}

            // 如果是开始节点，处理初始输入
            if (node.name === 'startFunction' && input) {
                const { a, sys } = input
                if (a !== undefined) {
                    nodeData.inputs.inputValue = a
                }
                if (sys) {
                    Object.entries(sys).forEach(([key, value]) => {
                        const sysKey = `sys${key.charAt(0).toUpperCase() + key.slice(1)}`
                        nodeData.inputs[sysKey] = value
                    })
                }
            } else {
                nodeData.flowData = {}
                if (node.flowData?.innerNodes) {
                    nodeData.flowData.innerNodes = node.flowData.innerNodes
                }
                if (node.flowData?.innerEdges) {
                    nodeData.flowData.innerEdges = node.flowData.innerEdges
                }
                // 获取从其他节点传入的数据
                const nodeInputs = node.previousResult
                nodeData.previousResult = nodeInputs
                // 只覆盖连接的输入参数，保留其他默认值
                if (nodeInputs) {
                    if (typeof nodeInputs === 'object' && nodeInputs !== null) {
                        if ('result' in nodeInputs) {
                            nodeData.inputs.inputValue = nodeInputs.result
                        } else {
                            Object.entries(nodeInputs).forEach(([key, value]) => {
                                if (value !== undefined) {
                                    nodeData.inputs[key] = value
                                }
                            })
                        }
                    } else {
                        // 如果是简单值，直接设置为 inputValue
                        nodeData.inputs.inputValue = nodeInputs
                    }
                }
            }
            if (node.options) {
                nodeData.options = node.options
            }
            // 执行节点初始化
            const result = await node.init(nodeData, nodeData.inputs)
            node.previousResult = result

            return result
        } catch (error) {
            logger.error(`[FlowManager]: Error initializing node ${node.name}:`, error)
            throw error
        }
    }

    private findNextNodes(nodeId: string): IFlowNode[] {
        const node = this.nodeIdMap.get(nodeId)
        if (!node) throw new Error(`Node ${nodeId} not found`)

        const nextNodeIds = this.nodeConnections.get(nodeId) || []
        const result = node.previousResult

        // 如果是 LoopInput 节点，检查是否需要继续循环
        if (node.type === 'LoopInput') {
            // 查找连接到 output 输出的边
            const outputEdges = this.edges.filter(
                (edge) => edge.source === nodeId && (!edge.sourceHandle || edge.sourceHandle.includes('output'))
            )

            if (outputEdges.length > 0) {
                return outputEdges.map((edge) => {
                    const nextNode = this.nodeIdMap.get(edge.target)
                    if (!nextNode) throw new Error(`Next node ${edge.target} not found`)
                    return nextNode
                })
            }
        }

        // 如果是 LoopFunction 节点且执行结果为 failure
        if (node.type === 'LoopFunction') {
            if (result?.failure) {
                // 查找连接到 failure 输出的边
                const failureEdges = this.edges.filter((edge) => edge.source === nodeId && edge.sourceHandle?.includes('failure'))

                if (failureEdges.length > 0) {
                    return failureEdges.map((edge) => {
                        const nextNode = this.nodeIdMap.get(edge.target)
                        if (!nextNode) throw new Error(`Next node ${edge.target} not found`)
                        return nextNode
                    })
                }
            } else if (result?.success) {
                // 查找连接到 success 输出的边
                const successEdges = this.edges.filter((edge) => edge.source === nodeId && edge.sourceHandle?.includes('success'))

                if (successEdges.length > 0) {
                    return successEdges.map((edge) => {
                        const nextNode = this.nodeIdMap.get(edge.target)
                        if (!nextNode) throw new Error(`Next node ${edge.target} not found`)
                        return nextNode
                    })
                }
            }
        }

        // 对于其他情况，返回所有连接的下一个节点
        return nextNodeIds.map((id) => {
            const nextNode = this.nodeIdMap.get(id)
            if (!nextNode) throw new Error(`Next node ${id} not found`)
            return nextNode
        })
    }

    private markNodesInLoop(startNodeId: string, inLoopNodes: Set<string>) {
        const visited = new Set<string>()

        const markRecursively = (nodeId: string, isInLoop: boolean = true) => {
            if (visited.has(nodeId)) return
            visited.add(nodeId)

            const node = this.nodeIdMap.get(nodeId)
            if (!node) return

            // 只有在循环内的节点才被标记
            if (nodeId && isInLoop) {
                inLoopNodes.add(nodeId)
            }

            const nextNodes = this.findNextNodes(nodeId)
            for (const nextNode of nextNodes) {
                if (nextNode.id) {
                    // LoopFunction后的节点不标记为循环节点
                    const shouldBeInLoop = isInLoop && node.type !== 'LoopFunction'
                    markRecursively(nextNode.id, shouldBeInLoop)
                }
            }
        }

        markRecursively(startNodeId)
    }

    /**
     * 执行整个流程
     */
    async executeFlow(initialInput?: any): Promise<IFlowExecutionResult> {
        if (!this.startNode) {
            throw new Error('No nodes in flow')
        }

        this.startTime = Date.now()
        const executedNodes = new Set<string>()
        const inLoopNodes = new Set<string>() // 跟踪在循环中的节点
        const nodeQueue: IFlowNode[] = [this.startNode]
        let finalResult: any = null
        let totalTokens = 0
        let currentLoopStartNodeId: string | null = null // 跟踪当前循环的起始节点

        const flowResults: IFlowExecutionResult = {
            flowId: this.flowId,
            results: [],
            status: 'success',
            executionTime: 0,
            tokenCount: 0
        }

        try {
            while (nodeQueue.length > 0) {
                const currentNode = nodeQueue.shift()!
                const nodeId = currentNode.id

                // 检查节点是否可以执行
                // 1. 如果节点在循环中，允许多次执行
                // 2. 如果是 LoopInput 节点，允许多次执行
                // 3. 如果节点未执行过，允许执行
                if (nodeId && executedNodes.has(nodeId) && !inLoopNodes.has(nodeId) && currentNode.type !== 'LoopInput') {
                    continue
                }

                // 获取节点的原始输入数据和输出数据
                const nodeInputs = currentNode.inputs || {}
                const nodeOutputs = currentNode.output || {}

                const nodeData: IExtendedNodeData = {
                    id: nodeId ?? currentNode.name,
                    name: currentNode.name,
                    label: currentNode.name,
                    type: currentNode.type,
                    icon: currentNode.icon,
                    version: currentNode.version,
                    category: currentNode.category,
                    baseClasses: currentNode.baseClasses,
                    inputs: nodeInputs,
                    outputs: nodeOutputs,
                    flowData: {
                        innerNodes: currentNode.flowData?.innerNodes,
                        innerEdges: currentNode.flowData?.innerEdges
                    }
                }

                // 如果有前一个节点的结果，设置为当前节点的 previousResult
                if (finalResult) {
                    currentNode.previousResult = finalResult
                    if (typeof finalResult === 'object' && finalResult !== null) {
                        if ('result' in finalResult) {
                            nodeData.inputs.inputValue = finalResult.result
                        } else if ('a' in finalResult) {
                            nodeData.inputs.inputValue = finalResult.a
                        }
                    }
                }

                const result = await this.initializeNode(currentNode, nodeData, currentNode === this.startNode ? initialInput : undefined)

                // 更新节点的输出
                if (result) {
                    const outputValue: INodeOutputsValue = {
                        label: 'Output',
                        name: 'output',
                        baseClasses: [typeof result],
                        description: 'Node execution result'
                    }

                    nodeData.outputs = nodeData.outputs || {}
                    if (typeof result === 'object' && result !== null) {
                        nodeData.outputs.result = result
                    } else {
                        nodeData.outputs.result = { value: result }
                    }

                    if (Array.isArray(currentNode.output)) {
                        currentNode.output = [...currentNode.output, outputValue]
                    } else {
                        currentNode.output = [outputValue]
                    }
                }

                finalResult = result
                flowResults.results.push({
                    nodeName: currentNode.name,
                    result: result
                })

                if (result?.tokenCount) {
                    totalTokens += result.tokenCount
                }

                // 处理循环相关的节点标记
                if (currentNode.type === 'LoopInput' && nodeId) {
                    // 记录循环开始节点
                    currentLoopStartNodeId = nodeId
                    // 递归标记所有循环中的节点
                    this.markNodesInLoop(nodeId, inLoopNodes)
                } else if (currentNode.type === 'LoopFunction') {
                    // 如果 LoopFunction 返回 success，说明循环结束
                    if (result?.success) {
                        // 清除所有循环中的节点标记
                        inLoopNodes.clear()
                        currentLoopStartNodeId = null
                    }
                    // 如果返回 failure，继续循环
                }

                if (nodeId) {
                    executedNodes.add(nodeId)
                    // 将下一个要执行的节点添加到队列
                    const nextNodes = this.findNextNodes(nodeId)
                    nodeQueue.push(...nextNodes)
                }
            }

            const executionTime = (Date.now() - this.startTime) / 1000

            flowResults.finalResult = finalResult
            flowResults.status = 'SUCCESS'
            flowResults.executionTime = executionTime
            flowResults.tokenCount = totalTokens

            return flowResults
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Error in flow execution: ${errorMessage}`)
        }
    }

    /**
     * 获取流程状态
     */
    getFlowStatus(): ICommonObject {
        return {
            flowId: this.flowId,
            nodeCount: this.nodes.size,
            currentNode: this.currentNode?.name,
            hasStartNode: !!this.startNode
        }
    }
}

/**
 * 验证节点数据的完整性
 */
const validateNodeData = (node: any): void => {
    if (!node || typeof node !== 'object') {
        throw new Error('Invalid node object')
    }

    if (!node.data || typeof node.data !== 'object') {
        throw new Error('Node must have a valid data object')
    }

    if (!node.data.name || typeof node.data.name !== 'string' || node.data.name.trim() === '') {
        throw new Error('Node must have a valid non-empty name in data object')
    }

    if (!node.data.type || typeof node.data.type !== 'string' || node.data.type.trim() === '') {
        throw new Error(`Node ${node.data.name} must have a valid type`)
    }

    if (!node.data.category || typeof node.data.category !== 'string' || node.data.category.trim() === '') {
        throw new Error(`Node ${node.data.name} must have a valid category`)
    }
}

/**
 * 构建并执行新的流程
 * @param req Express请求对象
 * @param _isInternal 是否是内部调用
 */
export const buildNewflow = async (req: Request, _isInternal: boolean = false): Promise<IFlowExecutionResult> => {
    try {
        // 获取 chatflow ID
        const chatflowId = req.params.id
        if (!chatflowId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Chatflow ID not provided')
        }

        // 获取 chatflow
        const chatflow = await chatflowsService.getChatflowById(chatflowId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // 解析 flowData 获取节点和边
        const flowData = JSON.parse(chatflow.flowData)
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []
        const chatId = req.body.chatId || uuidv4()
        const initialInput = req.body
        const sessionId = initialInput.sessionId || chatId
        const userMessageDateTime = new Date()

        if (!Array.isArray(nodes) || nodes.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid or empty nodes array in chatflow')
        }

        // 获取 API 配置
        const appServer = getRunningExpressApp()
        const availableVariables = await appServer.AppDataSource.getRepository(Variable).find()
        const { nodeOverrides, variableOverrides, apiOverrideStatus } = getAPIOverrideConfig(chatflow)

        // 创建流程配置
        const flowConfig = {
            chatflowid: chatflowId,
            chatId,
            sessionId,
            chatHistory: [],
            ...initialInput.overrideConfig
        }

        const flowManager = new FlowManager()

        // 添加边到流程管理器
        flowManager.addEdges(
            edges.map((edge: any) => ({
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle
            }))
        )

        // 验证并添加节点
        for (const node of nodes) {
            try {
                validateNodeData(node)

                // 获取节点实例
                const nodeInstanceFilePath = appServer.nodesPool.componentNodes[node.data.name].filePath as string
                const nodeModule = await import(nodeInstanceFilePath)
                const nodeInstance = new nodeModule.nodeClass()

                // 处理节点输入参数
                const nodeInputs: Record<string, any> = {}
                if (node.data.inputs) {
                    Object.entries(node.data.inputs).forEach(([key, value]) => {
                        if (value !== undefined && value !== '') {
                            nodeInputs[key] = value
                        }
                    })
                }

                // 如果是开始节点，添加来自请求的输入参数
                if (node.data.name === 'startFunction') {
                    const { a, sys } = initialInput
                    if (a !== undefined) {
                        nodeInputs['a'] = a
                    }
                    if (sys) {
                        Object.entries(sys).forEach(([key, value]) => {
                            const sysKey = `sys${key.charAt(0).toUpperCase() + key.slice(1)}`
                            nodeInputs[sysKey] = value
                        })
                    }
                }

                // 将实例方法和输入参数复制到节点数据中
                const nodeData = {
                    ...node.data,
                    id: node.id,
                    inputs: nodeInputs,
                    init: nodeInstance.init.bind(nodeInstance),
                    flowData: node.data.flowData
                }

                // 如果是 Loop 节点，添加内部节点和边的数据
                if (node.data.type === 'loop') {
                    const innerNodes: IFlowNode[] = node.data.innerNodes || []
                    const innerEdges: Array<IFlowEdge> = node.data.innerEdges || []

                    try {
                        // 确保内部节点和边被正确处理
                        const processedInnerNodes = innerNodes.map((innerNode: IFlowNode) => ({
                            ...innerNode,
                            id: innerNode.id || uuidv4(),
                            type: innerNode.type || 'unknown'
                        }))

                        const processedInnerEdges: IFlowEdge[] = []
                        for (const edge of innerEdges) {
                            processedInnerEdges.push({
                                ...edge,
                                id: edge.id || uuidv4()
                            })
                        }

                        // 处理 Loop 节点的内部数据
                        ;(nodeData as IExtendedNodeData & { flowData: NonNullable<IExtendedNodeData['flowData']> }).flowData =
                            nodeData.flowData || {}
                        nodeData.flowData!.innerNodes = processedInnerNodes
                        nodeData.flowData!.innerEdges = processedInnerEdges

                        // 更新节点输入数据
                        nodeData.inputs = {
                            ...nodeData.inputs,
                            hasInnerFlow: true
                        }
                    } catch (error) {
                        logger.warn(`[FlowManager]: Failed to process inner data for Loop node ${node.id}:`, error)
                    }
                }

                const wsManager = WebSocketManager.getInstance()
                nodeData.options = {
                    chatflowid: chatflowId,
                    wsManager: wsManager.getWebSocketService()
                }
                flowManager.addNode(nodeData as IFlowNode)
            } catch (error: any) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `Error validating/adding node ${node.data?.name || 'unknown'}: ${error.message}`
                )
            }
        }

        // 执行流程
        const result = await flowManager.executeFlow(initialInput)
        logger.debug('[FlowManager]: Flow execution completed:', result)

        // 添加额外的结果信息
        return {
            ...result,
            chatId,
            status: result.status || 'SUCCESS',
            executionTime: result.executionTime || 0,
            tokenCount: result.tokenCount || 0
        }
    } catch (error: any) {
        logger.error('[FlowManager]: Build and execute flow error:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Flow execution failed: ${error.message || 'Unknown error'}`)
    }
}

export default FlowManager
