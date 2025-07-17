import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import {
    buildFlow,
    constructGraphs,
    databaseEntities,
    getAPIOverrideConfig,
    getEndingNodes,
    getStartingNodes,
    resolveVariables
} from '../../utils'
import { checkStorage, updateStorageUsage } from '../../utils/quotaUsage'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { IDepthQueue, IReactFlowNode } from '../../Interface'
import { ICommonObject, INodeData } from 'flowise-components'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import { v4 as uuidv4 } from 'uuid'
import { Variable } from '../../database/entities/Variable'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import { Organization } from '../../enterprise/database/entities/organization.entity'

const SOURCE_DOCUMENTS_PREFIX = '\n\n----FLOWISE_SOURCE_DOCUMENTS----\n\n'
const ARTIFACTS_PREFIX = '\n\n----FLOWISE_ARTIFACTS----\n\n'
const TOOL_ARGS_PREFIX = '\n\n----FLOWISE_TOOL_ARGS----\n\n'

const buildAndInitTool = async (chatflowid: string, _chatId?: string, _apiMessageId?: string) => {
    const appServer = getRunningExpressApp()
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowid
    })
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }

    const chatId = _chatId || uuidv4()
    const apiMessageId = _apiMessageId || uuidv4()
    const flowData = JSON.parse(chatflow.flowData)
    const nodes = flowData.nodes
    const edges = flowData.edges

    const toolAgentNode = nodes.find(
        (node: IReactFlowNode) => node.data.inputAnchors.find((acr) => acr.type === 'Tool') && node.data.category === 'Agents'
    )
    if (!toolAgentNode) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Agent with tools not found in chatflow ${chatflowid}`)
    }

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

    /*** Get API Config ***/
    const availableVariables = await appServer.AppDataSource.getRepository(Variable).findBy(getWorkspaceSearchOptions(chatflow.workspaceId))
    const { nodeOverrides, variableOverrides, apiOverrideStatus } = getAPIOverrideConfig(chatflow)

    // This can be public API, so we can only get orgId from the chatflow
    const chatflowWorkspaceId = chatflow.workspaceId
    const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
        id: chatflowWorkspaceId
    })
    if (!workspace) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${chatflowWorkspaceId} not found`)
    }
    const workspaceId = workspace.id

    const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
        id: workspace.organizationId
    })
    if (!org) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${workspace.organizationId} not found`)
    }

    const orgId = org.id
    const subscriptionId = org.subscriptionId

    const reactFlowNodes = await buildFlow({
        startingNodeIds,
        reactFlowNodes: nodes,
        reactFlowEdges: edges,
        graph,
        depthQueue,
        componentNodes: appServer.nodesPool.componentNodes,
        question: '',
        chatHistory: [],
        chatId: chatId,
        sessionId: chatId,
        chatflowid,
        apiMessageId,
        appDataSource: appServer.AppDataSource,
        usageCacheManager: appServer.usageCacheManager,
        cachePool: appServer.cachePool,
        apiOverrideStatus,
        nodeOverrides,
        availableVariables,
        variableOverrides,
        orgId,
        workspaceId,
        subscriptionId,
        updateStorageUsage,
        checkStorage
    })

    const nodeToExecute =
        endingNodeIds.length === 1
            ? reactFlowNodes.find((node: IReactFlowNode) => endingNodeIds[0] === node.id)
            : reactFlowNodes[reactFlowNodes.length - 1]

    if (!nodeToExecute) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node not found`)
    }

    const flowDataObj: ICommonObject = { chatflowid, chatId }

    const reactFlowNodeData: INodeData = await resolveVariables(
        nodeToExecute.data,
        reactFlowNodes,
        '',
        [],
        flowDataObj,
        '',
        availableVariables,
        variableOverrides
    )
    let nodeToExecuteData = reactFlowNodeData

    const nodeInstanceFilePath = appServer.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
    const nodeModule = await import(nodeInstanceFilePath)
    const nodeInstance = new nodeModule.nodeClass()

    const agent = await nodeInstance.init(nodeToExecuteData, '', {
        chatflowid,
        chatId,
        orgId,
        workspaceId,
        appDataSource: appServer.AppDataSource,
        databaseEntities,
        analytic: chatflow.analytic
    })

    return agent
}

const getAgentTools = async (chatflowid: string): Promise<any> => {
    try {
        const agent = await buildAndInitTool(chatflowid)
        const tools = agent.tools
        return tools.map(convertToOpenAIFunction)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiRealTimeService.getAgentTools - ${getErrorMessage(error)}`
        )
    }
}

const executeAgentTool = async (
    chatflowid: string,
    chatId: string,
    toolName: string,
    inputArgs: string,
    apiMessageId?: string
): Promise<any> => {
    try {
        const agent = await buildAndInitTool(chatflowid, chatId, apiMessageId)
        const tools = agent.tools
        const tool = tools.find((tool: any) => tool.name === toolName)

        if (!tool) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolName} not found`)
        }

        const inputArgsObj = typeof inputArgs === 'string' ? JSON.parse(inputArgs) : inputArgs

        let toolOutput = await tool.call(inputArgsObj, undefined, undefined, { chatId })

        if (typeof toolOutput === 'object') {
            toolOutput = JSON.stringify(toolOutput)
        }

        let sourceDocuments = []
        if (typeof toolOutput === 'string' && toolOutput.includes(SOURCE_DOCUMENTS_PREFIX)) {
            const _splitted = toolOutput.split(SOURCE_DOCUMENTS_PREFIX)
            toolOutput = _splitted[0]
            const _sourceDocuments = JSON.parse(_splitted[1].trim())
            if (Array.isArray(_sourceDocuments)) {
                sourceDocuments = _sourceDocuments
            } else {
                sourceDocuments.push(_sourceDocuments)
            }
        }

        let artifacts = []
        if (typeof toolOutput === 'string' && toolOutput.includes(ARTIFACTS_PREFIX)) {
            const _splitted = toolOutput.split(ARTIFACTS_PREFIX)
            toolOutput = _splitted[0]
            const _artifacts = JSON.parse(_splitted[1].trim())
            if (Array.isArray(_artifacts)) {
                artifacts = _artifacts
            } else {
                artifacts.push(_artifacts)
            }
        }

        if (typeof toolOutput === 'string' && toolOutput.includes(TOOL_ARGS_PREFIX)) {
            const _splitted = toolOutput.split(TOOL_ARGS_PREFIX)
            toolOutput = _splitted[0]
        }

        return {
            output: toolOutput,
            sourceDocuments,
            artifacts
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiRealTimeService.executeAgentTool - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAgentTools,
    executeAgentTool
}
