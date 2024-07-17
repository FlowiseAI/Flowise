import {
    ICommonObject,
    IMultiAgentNode,
    IAgentReasoning,
    IAction,
    ITeamState,
    ConsoleCallbackHandler,
    additionalCallbacks,
    ISeqAgentsState,
    ISeqAgentNode,
    IUsedTool,
    IDocument
} from 'flowise-components'
import { Server } from 'socket.io'
import { omit, cloneDeep, flatten, uniq } from 'lodash'
import { StateGraph, END, START } from '@langchain/langgraph'
import { Document } from '@langchain/core/documents'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { StructuredTool } from '@langchain/core/tools'
import { BaseMessage, HumanMessage, AIMessage, AIMessageChunk, ToolMessage } from '@langchain/core/messages'
import {
    IChatFlow,
    IComponentNodes,
    IDepthQueue,
    IReactFlowNode,
    IReactFlowObject,
    IReactFlowEdge,
    IMessage,
    IncomingInput
} from '../Interface'
import {
    buildFlow,
    getStartingNodes,
    getEndingNodes,
    constructGraphs,
    databaseEntities,
    getSessionChatHistory,
    getMemorySessionId
} from '../utils'
import { getRunningExpressApp } from './getRunningExpressApp'
import { replaceInputsWithConfig, resolveVariables } from '.'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { getErrorMessage } from '../errors/utils'
import logger from './logger'

/**
 * Build Agent Graph
 * @param {IChatFlow} chatflow
 * @param {string} chatId
 * @param {string} sessionId
 * @param {ICommonObject} incomingInput
 * @param {boolean} isInternal
 * @param {string} baseURL
 * @param {Server} socketIO
 */
export const buildAgentGraph = async (
    chatflow: IChatFlow,
    chatId: string,
    sessionId: string,
    incomingInput: IncomingInput,
    isInternal: boolean,
    baseURL?: string,
    socketIO?: Server
): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflowid = chatflow.id

        /*** Get chatflows and prepare data  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges

        /*** Get Ending Node with Directed Graph  ***/
        const { graph, nodeDependencies } = constructGraphs(nodes, edges)
        const directedGraph = graph

        const endingNodes = getEndingNodes(nodeDependencies, directedGraph, nodes)

        /*** Get Starting Nodes with Reversed Graph ***/
        const constructedObj = constructGraphs(nodes, edges, { isReversed: true })
        const nonDirectedGraph = constructedObj.graph
        let startingNodeIds: string[] = []
        let depthQueue: IDepthQueue = {}
        const endingNodeIds = endingNodes.map((n) => n.id)
        for (const endingNodeId of endingNodeIds) {
            const resx = getStartingNodes(nonDirectedGraph, endingNodeId)
            startingNodeIds.push(...resx.startingNodeIds)
            depthQueue = Object.assign(depthQueue, resx.depthQueue)
        }
        startingNodeIds = [...new Set(startingNodeIds)]

        /*** Get Memory Node for Chat History ***/
        let chatHistory: IMessage[] = []
        const memoryNode = nodes.find((node) => node.data.name === 'agentMemory')
        if (memoryNode) {
            chatHistory = await getSessionChatHistory(
                chatflowid,
                getMemorySessionId(memoryNode, incomingInput, chatId, isInternal),
                memoryNode,
                appServer.nodesPool.componentNodes,
                appServer.AppDataSource,
                databaseEntities,
                logger,
                incomingInput.history
            )
        }

        // Initialize nodes like ChatModels, Tools, etc.
        const reactFlowNodes: IReactFlowNode[] = await buildFlow({
            startingNodeIds,
            reactFlowNodes: nodes,
            reactFlowEdges: edges,
            graph,
            depthQueue,
            componentNodes: appServer.nodesPool.componentNodes,
            question: incomingInput.question,
            chatHistory,
            chatId,
            sessionId,
            chatflowid,
            appDataSource: appServer.AppDataSource,
            overrideConfig: incomingInput?.overrideConfig,
            cachePool: appServer.cachePool,
            isUpsert: false,
            uploads: incomingInput.uploads,
            baseURL
        })

        const options = {
            chatId,
            sessionId,
            chatflowid,
            logger,
            analytic: chatflow.analytic,
            appDataSource: appServer.AppDataSource,
            databaseEntities: databaseEntities,
            cachePool: appServer.cachePool,
            uploads: incomingInput.uploads,
            baseURL,
            signal: new AbortController()
        }

        let streamResults
        let finalResult = ''
        let finalSummarization = ''
        let agentReasoning: IAgentReasoning[] = []
        let isSequential = false
        let lastMessageRaw = {} as AIMessageChunk
        let finalAction: IAction = {}
        let totalSourceDocuments: IDocument[] = []
        let totalUsedTools: IUsedTool[] = []

        const workerNodes = reactFlowNodes.filter((node) => node.data.name === 'worker')
        const supervisorNodes = reactFlowNodes.filter((node) => node.data.name === 'supervisor')
        const seqAgentNodes = reactFlowNodes.filter((node) => node.data.category === 'Sequential Agents')

        const mapNameToLabel: Record<string, { label: string; nodeName: string }> = {}

        for (const node of [...workerNodes, ...supervisorNodes, ...seqAgentNodes]) {
            if (!Object.prototype.hasOwnProperty.call(mapNameToLabel, node.data.instance.name)) {
                mapNameToLabel[node.data.instance.name] = {
                    label: node.data.instance.label,
                    nodeName: node.data.name
                }
            }
        }

        try {
            if (!seqAgentNodes.length) {
                streamResults = await compileMultiAgentsGraph(
                    chatflow,
                    mapNameToLabel,
                    reactFlowNodes,
                    endingNodeIds,
                    appServer.nodesPool.componentNodes,
                    options,
                    startingNodeIds,
                    incomingInput.question,
                    chatHistory,
                    incomingInput?.overrideConfig,
                    sessionId || chatId
                )
            } else {
                isSequential = true
                streamResults = await compileSeqAgentsGraph(
                    depthQueue,
                    chatflow,
                    reactFlowNodes,
                    edges,
                    appServer.nodesPool.componentNodes,
                    options,
                    incomingInput.question,
                    chatHistory,
                    incomingInput?.overrideConfig,
                    sessionId || chatId,
                    incomingInput.action
                )
            }

            if (streamResults) {
                let isStreamingStarted = false
                for await (const output of await streamResults) {
                    if (!output?.__end__) {
                        for (const agentName of Object.keys(output)) {
                            const nodeId = output[agentName]?.messages
                                ? output[agentName].messages[output[agentName].messages.length - 1]?.additional_kwargs?.nodeId
                                : ''
                            const usedTools = output[agentName]?.messages
                                ? output[agentName].messages.map((msg: BaseMessage) => msg.additional_kwargs?.usedTools)
                                : []
                            const sourceDocuments = output[agentName]?.messages
                                ? output[agentName].messages.map((msg: BaseMessage) => msg.additional_kwargs?.sourceDocuments)
                                : []
                            const messages = output[agentName]?.messages
                                ? output[agentName].messages.map((msg: BaseMessage) => (typeof msg === 'string' ? msg : msg.content))
                                : []
                            lastMessageRaw = output[agentName]?.messages
                                ? output[agentName].messages[output[agentName].messages.length - 1]
                                : {}

                            const state = omit(output[agentName], ['messages'])

                            if (usedTools && usedTools.length) {
                                const cleanedTools = usedTools.filter((tool: IUsedTool) => tool)
                                if (cleanedTools.length) totalUsedTools.push(...cleanedTools)
                            }

                            if (sourceDocuments && sourceDocuments.length) {
                                const cleanedDocs = sourceDocuments.filter((documents: IDocument) => documents)
                                if (cleanedDocs.length) totalSourceDocuments.push(...cleanedDocs)
                            }

                            if (isSequential) {
                                // check if previous node is condition
                                const inputEdges = edges.filter(
                                    (edg) => edg.target === nodeId && edg.targetHandle.includes(`${nodeId}-input-sequentialNode`)
                                )

                                inputEdges.forEach((edge) => {
                                    const parentNode = reactFlowNodes.find((nd) => nd.id === edge.source)
                                    if (parentNode) {
                                        if (parentNode.data.name.includes('seqCondition')) {
                                            const newMessages = messages.slice(0, -1)
                                            newMessages.push(mapNameToLabel[agentName].label)
                                            const reasoning = {
                                                agentName: parentNode.data.instance?.label || parentNode.data.type,
                                                messages: newMessages,
                                                nodeName: parentNode.data.name,
                                                nodeId: parentNode.data.id
                                            }
                                            agentReasoning.push(reasoning)
                                        }
                                    }
                                })
                            }

                            const reasoning = {
                                agentName: mapNameToLabel[agentName].label,
                                messages,
                                next: output[agentName]?.next,
                                instructions: output[agentName]?.instructions,
                                usedTools: flatten(usedTools) as IUsedTool[],
                                sourceDocuments: flatten(sourceDocuments) as Document[],
                                state,
                                nodeName: isSequential ? mapNameToLabel[agentName].nodeName : undefined,
                                nodeId
                            }
                            agentReasoning.push(reasoning)

                            finalSummarization = output[agentName]?.summarization ?? ''

                            if (socketIO && incomingInput.socketIOClientId) {
                                if (!isStreamingStarted) {
                                    isStreamingStarted = true
                                    socketIO.to(incomingInput.socketIOClientId).emit('start', agentReasoning)
                                }

                                socketIO.to(incomingInput.socketIOClientId).emit('agentReasoning', agentReasoning)

                                // Send loading next agent indicator
                                if (reasoning.next && reasoning.next !== 'FINISH' && reasoning.next !== 'END') {
                                    socketIO
                                        .to(incomingInput.socketIOClientId)
                                        .emit('nextAgent', mapNameToLabel[reasoning.next].label || reasoning.next)
                                }
                            }
                        }
                    } else {
                        finalResult = output.__end__.messages.length ? output.__end__.messages.pop()?.content : ''
                        if (Array.isArray(finalResult)) finalResult = output.__end__.instructions

                        if (socketIO && incomingInput.socketIOClientId) {
                            socketIO.to(incomingInput.socketIOClientId).emit('token', finalResult)
                        }
                    }
                }

                /*
                 * For multi agents mode, sometimes finalResult is empty
                 * Provide summary as final result
                 */
                if (!isSequential && !finalResult && finalSummarization) {
                    finalResult = finalSummarization
                    if (socketIO && incomingInput.socketIOClientId) {
                        socketIO.to(incomingInput.socketIOClientId).emit('token', finalResult)
                    }
                }

                /*
                 * For sequential mode, sometimes finalResult is empty
                 * Use last agent message as final result
                 */
                if (isSequential && !finalResult && agentReasoning.length) {
                    const lastMessages = agentReasoning[agentReasoning.length - 1].messages
                    const lastAgentReasoningMessage = lastMessages[lastMessages.length - 1]

                    if (lastAgentReasoningMessage) {
                        finalResult = lastAgentReasoningMessage
                        if (socketIO && incomingInput.socketIOClientId) {
                            socketIO.to(incomingInput.socketIOClientId).emit('token', finalResult)
                        }
                    } else if (!lastAgentReasoningMessage && lastMessageRaw.tool_calls && lastMessageRaw.tool_calls.length > 0) {
                        /*
                         * This is dedicated logic for interrupting tool nodes
                         */
                        const tooNodeId = edges.find(
                            (edge) =>
                                edge.target.includes('seqToolNode') &&
                                edge.source === (lastMessageRaw.additional_kwargs && lastMessageRaw.additional_kwargs.nodeId)
                        )?.target
                        const connectedToolNode = reactFlowNodes.find((node) => node.id === tooNodeId)
                        const mappedToolCalls = lastMessageRaw.tool_calls.map((toolCall) => {
                            return { tool: toolCall.name, toolInput: toolCall.args, toolOutput: '' }
                        })

                        if (connectedToolNode) {
                            const result = await connectedToolNode.data.instance.node.approvalFunc(mappedToolCalls)
                            finalResult = result || 'Do you want to proceed?'
                            const approveButtonText = connectedToolNode.data.inputs?.approveButtonText || 'Yes'
                            const rejectButtonText = connectedToolNode.data.inputs?.rejectButtonText || 'No'
                            finalAction = {
                                id: uuidv4(),
                                mapping: { approve: approveButtonText, reject: rejectButtonText, toolCalls: lastMessageRaw.tool_calls },
                                elements: [
                                    { type: 'approve-button', label: approveButtonText },
                                    { type: 'reject-button', label: rejectButtonText }
                                ]
                            }
                            if (socketIO && incomingInput.socketIOClientId) {
                                socketIO.to(incomingInput.socketIOClientId).emit('token', finalResult)
                                socketIO.to(incomingInput.socketIOClientId).emit('action', finalAction)
                            }
                        }

                        totalUsedTools.push(...mappedToolCalls)
                    }
                }

                totalSourceDocuments = uniq(flatten(totalSourceDocuments))
                totalUsedTools = uniq(flatten(totalUsedTools))

                if (socketIO && incomingInput.socketIOClientId) {
                    socketIO.to(incomingInput.socketIOClientId).emit('usedTools', totalUsedTools)
                    socketIO.to(incomingInput.socketIOClientId).emit('sourceDocuments', totalSourceDocuments)
                    socketIO.to(incomingInput.socketIOClientId).emit('end')
                }

                return {
                    finalResult,
                    finalAction,
                    sourceDocuments: totalSourceDocuments,
                    usedTools: totalUsedTools,
                    agentReasoning
                }
            }
        } catch (e) {
            if (getErrorMessage(e).includes('Aborted')) {
                if (socketIO && incomingInput.socketIOClientId) {
                    socketIO.to(incomingInput.socketIOClientId).emit('abort')
                }
                return { finalResult, agentReasoning }
            }
            throw new Error(getErrorMessage(e))
        }
        return streamResults
    } catch (e) {
        logger.error('[server]: Error:', e)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error buildAgentGraph - ${getErrorMessage(e)}`)
    }
}

/**
 * Compile Multi Agents Graph
 * @param {IChatFlow} chatflow
 * @param {Record<string, {label: string, nodeName: string }>} mapNameToLabel
 * @param {IReactFlowNode[]} reactflowNodes
 * @param {string[]} workerNodeIds
 * @param {IComponentNodes} componentNodes
 * @param {ICommonObject} options
 * @param {string[]} startingNodeIds
 * @param {string} question
 * @param {ICommonObject} overrideConfig
 * @param {string} threadId
 */
const compileMultiAgentsGraph = async (
    chatflow: IChatFlow,
    mapNameToLabel: Record<string, { label: string; nodeName: string }>,
    reactflowNodes: IReactFlowNode[] = [],
    workerNodeIds: string[],
    componentNodes: IComponentNodes,
    options: ICommonObject,
    startingNodeIds: string[],
    question: string,
    chatHistory: IMessage[] = [],
    overrideConfig?: ICommonObject,
    threadId?: string
) => {
    const appServer = getRunningExpressApp()
    const channels: ITeamState = {
        messages: {
            value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
            default: () => []
        },
        next: 'initialState',
        instructions: "Solve the user's request.",
        team_members: [],
        summarization: 'summarize'
    }

    const workflowGraph = new StateGraph<ITeamState>({
        //@ts-ignore
        channels
    })

    const workerNodes = reactflowNodes.filter((node) => workerNodeIds.includes(node.data.id))

    let supervisorWorkers: { [key: string]: IMultiAgentNode[] } = {}

    // Init worker nodes
    for (const workerNode of workerNodes) {
        const nodeInstanceFilePath = componentNodes[workerNode.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()

        let flowNodeData = cloneDeep(workerNode.data)
        if (overrideConfig) flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig)
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, chatHistory)

        try {
            const workerResult: IMultiAgentNode = await newNodeInstance.init(flowNodeData, question, options)
            const parentSupervisor = workerResult.parentSupervisorName
            if (!parentSupervisor || workerResult.type !== 'worker') continue
            if (Object.prototype.hasOwnProperty.call(supervisorWorkers, parentSupervisor)) {
                supervisorWorkers[parentSupervisor].push(workerResult)
            } else {
                supervisorWorkers[parentSupervisor] = [workerResult]
            }

            workflowGraph.addNode(workerResult.name, workerResult.node)
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize worker nodes - ${getErrorMessage(e)}`)
        }
    }

    // Init supervisor nodes
    for (const supervisor in supervisorWorkers) {
        const supervisorInputLabel = mapNameToLabel[supervisor].label
        const supervisorNode = reactflowNodes.find((node) => supervisorInputLabel === node.data.inputs?.supervisorName)
        if (!supervisorNode) continue

        const nodeInstanceFilePath = componentNodes[supervisorNode.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()

        let flowNodeData = cloneDeep(supervisorNode.data)

        if (overrideConfig) flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig)
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, chatHistory)

        if (flowNodeData.inputs) flowNodeData.inputs.workerNodes = supervisorWorkers[supervisor]

        try {
            const supervisorResult: IMultiAgentNode = await newNodeInstance.init(flowNodeData, question, options)
            if (!supervisorResult.workers?.length) continue

            if (supervisorResult.moderations && supervisorResult.moderations.length > 0) {
                try {
                    for (const moderation of supervisorResult.moderations) {
                        question = await moderation.checkForViolations(question)
                    }
                } catch (e) {
                    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
                }
            }

            workflowGraph.addNode(supervisorResult.name, supervisorResult.node)

            for (const worker of supervisorResult.workers) {
                //@ts-ignore
                workflowGraph.addEdge(worker, supervisorResult.name)
            }

            let conditionalEdges: { [key: string]: string } = {}
            for (let i = 0; i < supervisorResult.workers.length; i++) {
                conditionalEdges[supervisorResult.workers[i]] = supervisorResult.workers[i]
            }

            //@ts-ignore
            workflowGraph.addConditionalEdges(supervisorResult.name, (x: ITeamState) => x.next, {
                ...conditionalEdges,
                FINISH: END
            })

            //@ts-ignore
            workflowGraph.addEdge(START, supervisorResult.name)

            // Add agentflow to pool
            ;(workflowGraph as any).signal = options.signal
            appServer.chatflowPool.add(
                `${chatflow.id}_${options.chatId}`,
                workflowGraph as any,
                reactflowNodes.filter((node) => startingNodeIds.includes(node.id)),
                overrideConfig
            )

            // Get memory
            let memory = supervisorResult?.checkpointMemory

            const graph = workflowGraph.compile({ checkpointer: memory })

            const loggerHandler = new ConsoleCallbackHandler(logger)
            const callbacks = await additionalCallbacks(flowNodeData, options)
            const config = { configurable: { thread_id: threadId } }

            // Return stream result as we should only have 1 supervisor
            return await graph.stream(
                {
                    messages: [new HumanMessage({ content: question })]
                },
                { recursionLimit: supervisorResult?.recursionLimit ?? 100, callbacks: [loggerHandler, ...callbacks], configurable: config }
            )
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize supervisor nodes - ${getErrorMessage(e)}`)
        }
    }
}

/**
 * Compile Seq Agents Graph
 * @param {IDepthQueue} depthQueue
 * @param {IChatFlow} chatflow
 * @param {IReactFlowNode[]} reactflowNodes
 * @param {IReactFlowEdge[]} reactflowEdges
 * @param {IComponentNodes} componentNodes
 * @param {ICommonObject} options
 * @param {string} question
 * @param {IMessage[]} chatHistory
 * @param {ICommonObject} overrideConfig
 * @param {string} threadId
 * @param {IAction} action
 */
const compileSeqAgentsGraph = async (
    depthQueue: IDepthQueue,
    chatflow: IChatFlow,
    reactflowNodes: IReactFlowNode[] = [],
    reactflowEdges: IReactFlowEdge[] = [],
    componentNodes: IComponentNodes,
    options: ICommonObject,
    question: string,
    chatHistory: IMessage[] = [],
    overrideConfig?: ICommonObject,
    threadId?: string,
    action?: IAction
) => {
    const appServer = getRunningExpressApp()

    let channels: ISeqAgentsState = {
        messages: {
            value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
            default: () => []
        }
    }

    // Get state
    const seqStateNode = reactflowNodes.find((node: IReactFlowNode) => node.data.name === 'seqState')
    if (seqStateNode) {
        channels = {
            ...seqStateNode.data.instance.node,
            ...channels
        }
    }

    const seqGraph = new StateGraph<any>({
        //@ts-ignore
        channels
    })

    /*** Validate Graph ***/
    const startAgentNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqStart')
    if (!startAgentNodes.length) throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Start node not found')
    if (startAgentNodes.length > 1)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Graph should have only one start node')

    const endAgentNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqEnd')
    const loopNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqLoop')
    if (!endAgentNodes.length && !loopNodes.length) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Graph should have at least one End/Loop node')
    }
    /*** End of Validation ***/

    let flowNodeData
    let conditionalEdges: Record<string, { nodes: Record<string, string>; func: any }> = {}
    let conditionalToolNodes: Record<string, { source: ISeqAgentNode; toolNodes: ISeqAgentNode[] }> = {}
    let bindModel: Record<string, any> = {}
    let interruptToolNodeNames = []

    const initiateNode = async (node: IReactFlowNode) => {
        const nodeInstanceFilePath = componentNodes[node.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()

        flowNodeData = cloneDeep(node.data)
        if (overrideConfig) flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig)
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, chatHistory)

        const seqAgentNode: ISeqAgentNode = await newNodeInstance.init(flowNodeData, question, options)
        return seqAgentNode
    }

    /** Prepare Conditional Edges
     *  Example: {
     *    'seqCondition_1': { nodes: { 'Yes': 'agentName1', 'No': 'agentName2' }, func: <condition-function> },
     *    'seqCondition_2': { nodes: { 'Yes': 'agentName3', 'No': 'agentName4' }, func: <condition-function> }
     *  }
     * */
    const prepareConditionalEdges = (nodeId: string, nodeInstance: ISeqAgentNode) => {
        const conditionEdges = reactflowEdges.filter((edge) => edge.target === nodeId && edge.source.includes('seqCondition')) ?? []

        for (const conditionEdge of conditionEdges) {
            const conditionNodeId = conditionEdge.source
            const conditionNodeOutputAnchorId = conditionEdge.sourceHandle

            const conditionNode = reactflowNodes.find((node) => node.id === conditionNodeId)
            const outputAnchors = conditionNode?.data.outputAnchors

            if (!outputAnchors || !outputAnchors.length || !outputAnchors[0].options) continue

            const conditionOutputAnchorLabel =
                outputAnchors[0].options.find((option: any) => option.id === conditionNodeOutputAnchorId)?.label ?? ''

            if (!conditionOutputAnchorLabel) continue

            if (Object.prototype.hasOwnProperty.call(conditionalEdges, conditionNodeId)) {
                conditionalEdges[conditionNodeId] = {
                    ...conditionalEdges[conditionNodeId],
                    nodes: { ...conditionalEdges[conditionNodeId].nodes, [conditionOutputAnchorLabel]: nodeInstance.name }
                }
            } else {
                conditionalEdges[conditionNodeId] = {
                    nodes: { [conditionOutputAnchorLabel]: nodeInstance.name },
                    func: conditionNode.data.instance.node
                }
            }
        }
    }

    /** Prepare Conditional Tool Edges
     *  Example: {
     *    'agent_1': { source: agent, toolNodes: [node] }
     *  }
     * */
    const prepareConditionalToolEdges = (predecessorAgent: ISeqAgentNode, nodeInstance: ISeqAgentNode) => {
        if (Object.prototype.hasOwnProperty.call(conditionalToolNodes, predecessorAgent.id)) {
            const toolNodes = conditionalToolNodes[predecessorAgent.id].toolNodes
            toolNodes.push(nodeInstance)
            conditionalToolNodes[predecessorAgent.id] = { source: predecessorAgent, toolNodes }
        } else {
            conditionalToolNodes[predecessorAgent.id] = {
                source: predecessorAgent,
                toolNodes: [nodeInstance]
            }
        }
    }

    const createBindModel = (agent: ISeqAgentNode, toolNodeInstance: ISeqAgentNode) => {
        const tools = flatten(toolNodeInstance.node?.tools)
        bindModel[agent.id] = agent.llm.bindTools(tools)
    }

    for (const agentNodeId of getSortedDepthNodes(depthQueue)) {
        const agentNode = reactflowNodes.find((node) => node.id === agentNodeId)
        if (!agentNode) continue

        /*** Start processing every Agent nodes ***/
        const eligibleSeqNodes = ['seqAgent', 'seqEnd', 'seqLoop', 'seqToolNode', 'seqLLMNode']
        const nodesToAdd = ['seqAgent', 'seqToolNode', 'seqLLMNode']

        if (eligibleSeqNodes.includes(agentNode.data.name)) {
            try {
                const agentInstance: ISeqAgentNode = await initiateNode(agentNode)

                // Add node to graph
                if (nodesToAdd.includes(agentNode.data.name)) {
                    seqGraph.addNode(agentInstance.name, agentInstance.node)
                }

                if (agentInstance.predecessorAgents) {
                    const predecessorAgents: ISeqAgentNode[] = agentInstance.predecessorAgents

                    const edges = []
                    for (const predecessorAgent of predecessorAgents) {
                        // Add start edge and set entry point
                        if (predecessorAgent.name === START) {
                            if (agentInstance.moderations && agentInstance.moderations.length > 0) {
                                try {
                                    for (const moderation of agentInstance.moderations) {
                                        question = await moderation.checkForViolations(question)
                                    }
                                } catch (e) {
                                    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
                                }
                            }
                            //@ts-ignore
                            seqGraph.addEdge(START, agentInstance.name)
                        } else if (predecessorAgent.type === 'condition') {
                            prepareConditionalEdges(agentNode.data.id, agentInstance)
                        } else if (agentNode.data.name === 'seqToolNode') {
                            prepareConditionalToolEdges(predecessorAgent, agentInstance)
                            createBindModel(predecessorAgent, agentInstance)
                            if (agentInstance.node.interrupt) interruptToolNodeNames.push(agentInstance.name)
                        } else if (predecessorAgent.name) {
                            if (agentInstance.type === 'llm' && predecessorAgent.type === 'tool') {
                                createBindModel(agentInstance, predecessorAgent)
                            }
                            edges.push(predecessorAgent.name)
                        }
                    }

                    if (edges.length > 1) {
                        //@ts-ignore
                        seqGraph.addEdge(edges, agentInstance.name)
                    } else if (edges.length === 1) {
                        //@ts-ignore
                        seqGraph.addEdge(...edges, agentInstance.name)
                    }
                }
            } catch (e) {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize agent nodes - ${getErrorMessage(e)}`)
            }
        }
    }

    /*** Add conditional edges to graph ***/
    for (const conditionNodeId in conditionalEdges) {
        const startConditionEdges = reactflowEdges.filter((edge) => edge.target === conditionNodeId)
        if (!startConditionEdges.length) continue

        for (const startConditionEdge of startConditionEdges) {
            const startConditionNode = reactflowNodes.find((node) => node.id === startConditionEdge.source)
            if (!startConditionNode) continue
            seqGraph.addConditionalEdges(
                startConditionNode.data.instance.name,
                conditionalEdges[conditionNodeId].func,
                //@ts-ignore
                conditionalEdges[conditionNodeId].nodes
            )
        }
    }

    for (const llmSourceNodeId in conditionalToolNodes) {
        const connectedToolNodes = conditionalToolNodes[llmSourceNodeId].toolNodes
        const sourceNode = conditionalToolNodes[llmSourceNodeId].source

        const routeMessage = (state: ISeqAgentsState) => {
            const messages = state.messages as unknown as BaseMessage[]
            const lastMessage = messages[messages.length - 1] as AIMessage

            // If no tools are called, we can finish (respond to the user)
            if (!lastMessage.tool_calls?.length) {
                return END
            }

            for (const toolCall of lastMessage.tool_calls) {
                for (const toolNode of connectedToolNodes) {
                    const tools = toolNode.node?.tools as StructuredTool[]
                    if (tools.some((tool) => tool.name === toolCall.name)) {
                        return toolNode.name
                    }
                }
            }
            return END
        }

        seqGraph.addConditionalEdges(
            //@ts-ignore
            sourceNode.name,
            routeMessage
        )
    }

    // Add agentflow to pool
    ;(seqGraph as any).signal = options.signal
    appServer.chatflowPool.add(
        `${chatflow.id}_${options.chatId}`,
        seqGraph as any,
        reactflowNodes.filter((node) => startAgentNodes.map((nd) => nd.id).includes(node.id)),
        overrideConfig
    )

    // Get memory
    const startNode = reactflowNodes.find((node: IReactFlowNode) => node.data.name === 'seqStart')
    let memory = startNode?.data.instance?.checkpointMemory

    try {
        const graph = seqGraph.compile({ checkpointer: memory, interruptBefore: interruptToolNodeNames as any })

        const loggerHandler = new ConsoleCallbackHandler(logger)
        const callbacks = await additionalCallbacks(flowNodeData as any, options)
        const config = { configurable: { thread_id: threadId }, bindModel }

        // Return stream result
        let humanMsg: { messages: HumanMessage[] | ToolMessage[] } | null = {
            messages: [new HumanMessage({ content: question })]
        }

        if (action && action.mapping && question === action.mapping.approve) {
            humanMsg = null
        } else if (action && action.mapping && question === action.mapping.reject) {
            humanMsg = {
                messages: action.mapping.toolCalls.map((toolCall) => {
                    return new ToolMessage({
                        name: toolCall.name,
                        content: `Tool ${toolCall.name} call denied by user. Acknowledge that and ask if user needs any help.`,
                        tool_call_id: toolCall.id!
                    })
                })
            }
        }

        return await graph.stream(humanMsg, { callbacks: [loggerHandler, ...callbacks], configurable: config })
    } catch (e) {
        logger.error('Error compile graph', e)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error compile graph - ${getErrorMessage(e)}`)
    }
}

const getSortedDepthNodes = (depthQueue: IDepthQueue) => {
    // Step 1: Convert the object into an array of [key, value] pairs and sort them by the value
    const sortedEntries = Object.entries(depthQueue).sort((a, b) => a[1] - b[1])

    // Step 2: Group keys by their depth values
    const groupedByDepth: Record<number, string[]> = {}
    sortedEntries.forEach(([key, value]) => {
        if (!groupedByDepth[value]) {
            groupedByDepth[value] = []
        }
        groupedByDepth[value].push(key)
    })

    // Step 3: Create the final sorted array with grouped keys
    const sortedArray: (string | string[])[] = []
    Object.keys(groupedByDepth)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((depth) => {
            const items = groupedByDepth[parseInt(depth)]
            sortedArray.push(...items)
        })

    return sortedArray.flat()
}
