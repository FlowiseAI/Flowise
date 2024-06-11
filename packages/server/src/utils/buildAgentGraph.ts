import {
    ICommonObject,
    IMultiAgentNode,
    IAgentReasoning,
    ITeamState,
    ConsoleCallbackHandler,
    additionalCallbacks,
    ISeqAgentsState,
    ISeqAgentNode
} from 'flowise-components'
import { IChatFlow, IComponentNodes, IDepthQueue, IReactFlowNode, IReactFlowObject, IReactFlowEdge } from '../Interface'
import { Server } from 'socket.io'
import { buildFlow, getStartingNodes, getEndingNodes, constructGraphs, databaseEntities } from '../utils'
import { getRunningExpressApp } from './getRunningExpressApp'
import logger from './logger'
import { StateGraph, END, START } from '@langchain/langgraph'
import { BaseMessage, HumanMessage } from '@langchain/core/messages'
import { cloneDeep, flatten } from 'lodash'
import { replaceInputsWithConfig, resolveVariables } from '.'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { getErrorMessage } from '../errors/utils'

/**
 * Build Agent Graph
 * @param {IChatFlow} chatflow
 * @param {string} chatId
 * @param {string} sessionId
 * @param {ICommonObject} incomingInput
 * @param {string} baseURL
 * @param {Server} socketIO
 */
export const buildAgentGraph = async (
    chatflow: IChatFlow,
    chatId: string,
    sessionId: string,
    incomingInput: ICommonObject,
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

        // Initialize nodes like ChatModels, Tools, etc.
        const reactFlowNodes = await buildFlow({
            startingNodeIds,
            reactFlowNodes: nodes,
            reactFlowEdges: edges,
            graph,
            depthQueue,
            componentNodes: appServer.nodesPool.componentNodes,
            question: incomingInput.question,
            chatHistory: [],
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
        let agentReasoning: IAgentReasoning[] = []

        const workerNodes: IReactFlowNode[] = reactFlowNodes.filter((node: IReactFlowNode) => node.data.name === 'worker')
        const supervisorNodes: IReactFlowNode[] = reactFlowNodes.filter((node: IReactFlowNode) => node.data.name === 'supervisor')
        const seqAgentNodes: IReactFlowNode[] = reactFlowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqAgent')

        const mapNameToLabel: Record<string, string> = {}

        for (const node of [...workerNodes, ...supervisorNodes, ...seqAgentNodes]) {
            mapNameToLabel[node.data.instance.name] = node.data.instance.label
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
                    incomingInput?.overrideConfig
                )
            } else {
                streamResults = await compileSeqAgentsGraph(
                    chatflow,
                    mapNameToLabel,
                    reactFlowNodes,
                    edges,
                    appServer.nodesPool.componentNodes,
                    options,
                    incomingInput.question,
                    incomingInput?.overrideConfig
                )
            }

            if (streamResults) {
                let isStreamingStarted = false
                for await (const output of await streamResults) {
                    console.log('OUTPUTTTT ', output)
                    if (!output?.__end__) {
                        const agentName = Object.keys(output)[0]
                        const usedTools = output[agentName]?.messages
                            ? output[agentName].messages.map((msg: any) => msg.additional_kwargs?.usedTools)
                            : []
                        const sourceDocuments = output[agentName]?.messages
                            ? output[agentName].messages.map((msg: any) => msg.additional_kwargs?.sourceDocuments)
                            : []
                        const messages = output[agentName]?.messages ? output[agentName].messages.map((msg: any) => msg.content) : []
                        const reasoning = {
                            agentName: mapNameToLabel[agentName],
                            messages,
                            next: output[agentName]?.next,
                            instructions: output[agentName]?.instructions,
                            usedTools: flatten(usedTools),
                            sourceDocuments: flatten(sourceDocuments)
                        }
                        agentReasoning.push(reasoning)
                        if (socketIO && incomingInput.socketIOClientId) {
                            if (!isStreamingStarted) {
                                isStreamingStarted = true
                                socketIO.to(incomingInput.socketIOClientId).emit('start', JSON.stringify(agentReasoning))
                            }

                            socketIO.to(incomingInput.socketIOClientId).emit('agentReasoning', JSON.stringify(agentReasoning))

                            // Send loading next agent indicator
                            if (reasoning.next && reasoning.next !== 'FINISH' && reasoning.next !== 'END') {
                                socketIO
                                    .to(incomingInput.socketIOClientId)
                                    .emit('nextAgent', mapNameToLabel[reasoning.next] || reasoning.next)
                            }
                        }
                    } else {
                        finalResult = output.__end__.messages.length ? output.__end__.messages.pop()?.content : ''
                        if (Array.isArray(finalResult)) finalResult = output.__end__.instructions

                        if (finalResult === incomingInput.question) {
                            const supervisorNode = reactFlowNodes.find((node: IReactFlowNode) => node.data.name === 'supervisor')
                            const llm = supervisorNode?.data?.instance?.llm
                            if (llm) {
                                const res = await llm.invoke(incomingInput.question)
                                finalResult = res?.content
                            }
                        }

                        if (socketIO && incomingInput.socketIOClientId) {
                            socketIO.to(incomingInput.socketIOClientId).emit('token', finalResult)
                        }
                    }
                }

                return { finalResult, agentReasoning }
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
 * @param {Record<string, string>} mapNameToLabel
 * @param {IReactFlowNode[]} reactflowNodes
 * @param {string[]} workerNodeIds
 * @param {IComponentNodes} componentNodes
 * @param {ICommonObject} options
 * @param {string[]} startingNodeIds
 * @param {string} question
 * @param {ICommonObject} overrideConfig
 */
const compileMultiAgentsGraph = async (
    chatflow: IChatFlow,
    mapNameToLabel: Record<string, string>,
    reactflowNodes: IReactFlowNode[] = [],
    workerNodeIds: string[],
    componentNodes: IComponentNodes,
    options: ICommonObject,
    startingNodeIds: string[],
    question: string,
    overrideConfig?: ICommonObject
) => {
    const appServer = getRunningExpressApp()
    const channels: ITeamState = {
        messages: {
            value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
            default: () => []
        },
        next: 'initialState',
        instructions: "Solve the user's request.",
        team_members: []
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
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, [])

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
        const supervisorInputLabel = mapNameToLabel[supervisor]
        const supervisorNode = reactflowNodes.find((node) => supervisorInputLabel === node.data.inputs?.supervisorName)
        if (!supervisorNode) continue

        const nodeInstanceFilePath = componentNodes[supervisorNode.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()

        let flowNodeData = cloneDeep(supervisorNode.data)

        if (overrideConfig) flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig)
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, [])

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
                workflowGraph.addEdge(worker, supervisorResult.name)
            }

            let conditionalEdges: { [key: string]: string } = {}
            for (let i = 0; i < supervisorResult.workers.length; i++) {
                conditionalEdges[supervisorResult.workers[i]] = supervisorResult.workers[i]
            }

            workflowGraph.addConditionalEdges(supervisorResult.name, (x: ITeamState) => x.next, {
                ...conditionalEdges,
                FINISH: END
            })

            workflowGraph.setEntryPoint(supervisorResult.name)

            // Add agentflow to pool
            ;(workflowGraph as any).signal = options.signal
            appServer.chatflowPool.add(
                `${chatflow.id}_${options.chatId}`,
                workflowGraph as any,
                reactflowNodes.filter((node) => startingNodeIds.includes(node.id)),
                overrideConfig
            )

            // TODO: add persistence
            // const memory = new MemorySaver()
            const graph = workflowGraph.compile()

            const loggerHandler = new ConsoleCallbackHandler(logger)
            const callbacks = await additionalCallbacks(flowNodeData, options)

            // Return stream result as we should only have 1 supervisor
            return await graph.stream(
                {
                    messages: [new HumanMessage({ content: question })]
                },
                { recursionLimit: supervisorResult?.recursionLimit ?? 100, callbacks: [loggerHandler, ...callbacks] }
            )
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize supervisor nodes - ${getErrorMessage(e)}`)
        }
    }
}

const compileSeqAgentsGraph = async (
    chatflow: IChatFlow,
    mapNameToLabel: Record<string, string>,
    reactflowNodes: IReactFlowNode[] = [],
    reactflowEdges: IReactFlowEdge[] = [],
    componentNodes: IComponentNodes,
    options: ICommonObject,
    question: string,
    overrideConfig?: ICommonObject
) => {
    const appServer = getRunningExpressApp()
    const channels: ISeqAgentsState = {
        messages: {
            value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
            default: () => []
        }
    }

    const seqGraph = new StateGraph<ISeqAgentsState>({
        //@ts-ignore
        channels
    })

    /*** Validate Graph ***/
    const startAgentNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqStart')
    if (!startAgentNodes.length) throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Start node not found')
    if (startAgentNodes.length > 1)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Graph should have only one start node')

    const endAgentNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqEnd')
    if (!endAgentNodes.length) throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Graph should have at least one end node')

    let flowNodeData
    let conditionalEdges: Record<string, { nodes: Record<string, string>; func: any }> = {}

    const initiateNode = async (node: IReactFlowNode) => {
        const nodeInstanceFilePath = componentNodes[node.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()

        flowNodeData = cloneDeep(node.data)
        if (overrideConfig) flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig)
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, [])

        const seqAgentNode: ISeqAgentNode = await newNodeInstance.init(flowNodeData, question, options)
        return seqAgentNode
    }

    const prepareConditionalEdges = (nodeId: string, nodeInstance: ISeqAgentNode) => {
        /** Prepare Conditional Edges
         *  Example: {
         *    'seqCondition_1': { nodes: { 'Yes': 'agentName1', 'No': 'agentName2' }, func: <condition-function> },
         *    'seqCondition_2': { nodes: { 'Yes': 'agentName3', 'No': 'agentName4' }, func: <condition-function> }
         *  }
         * */

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

    /*** Start processing every Agent nodes ***/
    const seqAgentNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqAgent')
    for (const agentNode of seqAgentNodes) {
        try {
            const agentInstance: ISeqAgentNode = await initiateNode(agentNode)
            // Add node to graph
            seqGraph.addNode(agentInstance.name, agentInstance.node)

            if (agentInstance.predecessorAgent) {
                const predecessorAgent = agentInstance.predecessorAgent

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
                    seqGraph.setEntryPoint(agentInstance.name)
                } else if (predecessorAgent.type === 'condition') {
                    prepareConditionalEdges(agentNode.data.id, agentInstance)
                } else if (predecessorAgent.name) {
                    seqGraph.addEdge(predecessorAgent.name, agentInstance.name)
                }
            }
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize agent nodes - ${getErrorMessage(e)}`)
        }
    }

    /*** Start processing every END nodes ***/
    for (const endNode of endAgentNodes) {
        try {
            const endInstance: ISeqAgentNode = await initiateNode(endNode)
            if (endInstance.predecessorAgent) {
                const predecessorAgent = endInstance.predecessorAgent
                if (predecessorAgent.type === 'condition') {
                    prepareConditionalEdges(endNode.data.id, endInstance)
                } else if (predecessorAgent.name) {
                    seqGraph.addEdge(predecessorAgent.name, endInstance.name)
                }
            }
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize end nodes - ${getErrorMessage(e)}`)
        }
    }

    console.log('seqGraph conditionalEdges =', conditionalEdges)
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
                conditionalEdges[conditionNodeId].nodes
            )
        }
    }

    /*** Since we can't draw a backward loop, this is a dedicated agent to loop back to certain agent by adding an edge***/
    const seqLoopAgentNodes: IReactFlowNode[] = reactflowNodes.filter((node: IReactFlowNode) => node.data.name === 'seqLoopAgent')
    for (const agentNode of seqLoopAgentNodes) {
        try {
            const loopInstance: ISeqAgentNode = await initiateNode(agentNode)
            if (loopInstance.predecessorAgent) {
                const predecessorAgent = loopInstance.predecessorAgent
                seqGraph.addEdge(predecessorAgent.name, loopInstance.name)
            }
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize loop agent nodes - ${getErrorMessage(e)}`)
        }
    }

    // Add agentflow to pool
    ;(seqGraph as any).signal = options.signal
    appServer.chatflowPool.add(
        `${chatflow.id}_${options.chatId}`,
        seqGraph as any,
        reactflowNodes.filter((node) => startAgentNodes.map((nd) => nd.id).includes(node.id)),
        overrideConfig
    )

    // TODO: add persistence
    // const memory = new MemorySaver()

    try {
        const graph = seqGraph.compile()

        const loggerHandler = new ConsoleCallbackHandler(logger)
        const callbacks = await additionalCallbacks(flowNodeData as any, options)

        // Return stream result
        return await graph.stream(
            {
                messages: [new HumanMessage({ content: question })]
            },
            { callbacks: [loggerHandler, ...callbacks] }
        )
    } catch (e) {
        logger.error('Error compile graph', e)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error compile graph - ${getErrorMessage(e)}`)
    }
}
