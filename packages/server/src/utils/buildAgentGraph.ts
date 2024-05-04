import { ICommonObject, IMultiAgentNode, IAgentReasoning, ITeamState } from 'flowise-components'
import { IChatFlow, IComponentNodes, IDepthQueue, IReactFlowNode, IReactFlowObject } from '../Interface'
import { Server } from 'socket.io'
import { buildFlow, getStartingNodes, getEndingNodes, constructGraphs } from '../utils'
import { getRunningExpressApp } from './getRunningExpressApp'
import logger from './logger'
import { StateGraph, END } from '@langchain/langgraph'
import { BaseMessage, HumanMessage } from '@langchain/core/messages'
import { cloneDeep, flatten } from 'lodash'
import { replaceInputsWithConfig, resolveVariables } from '.'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { getErrorMessage } from '../errors/utils'

/**
 * Build Agent Graph
 * @param {IChatFlow} chatflow
 * @param {ICommonObject} incomingInput
 * @param {Server} socketIO
 */
export const buildAgentGraph = async (chatflow: IChatFlow, incomingInput: ICommonObject, socketIO?: Server): Promise<any> => {
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

        let chatHistory = incomingInput?.history
        let chatId = incomingInput.chatId ?? ''
        const sessionId = incomingInput.sessionId ?? ''

        const reactFlowNodes = await buildFlow(
            startingNodeIds,
            nodes,
            edges,
            graph,
            depthQueue,
            appServer.nodesPool.componentNodes,
            incomingInput.question,
            chatHistory,
            chatId,
            sessionId,
            chatflowid,
            appServer.AppDataSource,
            incomingInput?.overrideConfig,
            appServer.cachePool,
            false,
            undefined,
            incomingInput.uploads
        )

        const streamResults = await compileGraph(
            reactFlowNodes,
            endingNodeIds,
            appServer.nodesPool.componentNodes,
            incomingInput.question,
            incomingInput?.overrideConfig,
            socketIO,
            incomingInput.socketIOClientId
        )

        if (streamResults) {
            let finalResult = ''
            let agentReasoning: IAgentReasoning[] = []
            let isStreamingStarted = false
            for await (const output of await streamResults) {
                if (!output?.__end__) {
                    const agentName = Object.keys(output)[0]
                    const usedTools = output[agentName]?.messages
                        ? output[agentName].messages.map((msg: any) => msg.additional_kwargs?.usedTools)
                        : []
                    const messages = output[agentName]?.messages ? output[agentName].messages.map((msg: any) => msg.content) : []
                    const reasoning = {
                        agentName,
                        messages,
                        next: output[agentName]?.next,
                        instructions: output[agentName]?.instructions,
                        usedTools: flatten(usedTools)
                    }
                    agentReasoning.push(reasoning)
                    if (socketIO && incomingInput.socketIOClientId) {
                        if (!isStreamingStarted) {
                            isStreamingStarted = true
                            socketIO.to(incomingInput.socketIOClientId).emit('start', JSON.stringify(agentReasoning))
                        }
                        socketIO.to(incomingInput.socketIOClientId).emit('agentReasoning', JSON.stringify(agentReasoning))
                    }
                } else {
                    finalResult = output.__end__.messages.length ? output.__end__.messages.pop()?.content : ''
                    if (socketIO && incomingInput.socketIOClientId) {
                        socketIO.to(incomingInput.socketIOClientId).emit('token', finalResult)
                    }
                }
            }

            return { finalResult, agentReasoning }
        }
        return streamResults
    } catch (e: any) {
        logger.error('[server]: Error:', e)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error buildAgentGraph - ${getErrorMessage(e)}`)
    }
}

/**
 * Compile Graph
 * @param {IReactFlowNode[]} reactflowNodes
 * @param {string[]} workerNodeIds
 * @param {IComponentNodes} componentNodes
 * @param {string} question
 * @param {ICommonObject} overrideConfig
 */
const compileGraph = async (
    reactflowNodes: IReactFlowNode[] = [],
    workerNodeIds: string[],
    componentNodes: IComponentNodes,
    question: string,
    overrideConfig?: ICommonObject,
    socketIO?: Server,
    socketIOClientId?: string
) => {
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
            const workerResult: IMultiAgentNode = await newNodeInstance.init(flowNodeData, question, { socketIO, socketIOClientId })
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
        const supervisorNode = reactflowNodes.find((node) => supervisor === node.data.inputs?.supervisorName)
        if (!supervisorNode) continue

        const nodeInstanceFilePath = componentNodes[supervisorNode.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()

        let flowNodeData = cloneDeep(supervisorNode.data)

        if (overrideConfig) flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig)
        flowNodeData = resolveVariables(flowNodeData, reactflowNodes, question, [])

        if (flowNodeData.inputs) flowNodeData.inputs.workerNodes = supervisorWorkers[supervisor]

        try {
            const supervisorResult: IMultiAgentNode = await newNodeInstance.init(flowNodeData, question, { socketIO, socketIOClientId })
            if (!supervisorResult.workers?.length) continue

            if (supervisorResult.moderations && supervisorResult.moderations.length > 0) {
                try {
                    for (const moderation of supervisorResult.moderations) {
                        question = await moderation.checkForViolations(question)
                    }
                } catch (e: any) {
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

            workflowGraph.addConditionalEdges(supervisorResult.name, (x: any) => x.next, {
                ...conditionalEdges,
                FINISH: END
            })

            workflowGraph.setEntryPoint(supervisorResult.name)

            const graph = workflowGraph.compile()

            // Return stream result as we should only have 1 supervisor
            return await graph.stream(
                {
                    messages: [new HumanMessage({ content: question })]
                },
                { recursionLimit: supervisorResult?.recursionLimit ?? 100 }
            )
        } catch (e) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error initialize supervisor nodes - ${getErrorMessage(e)}`)
        }
    }
}
