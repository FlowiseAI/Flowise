import path from 'path'
import { IChildProcessMessage, IReactFlowNode, IReactFlowObject, IRunChatflowMessageValue, INodeData } from './Interface'
import {
    buildLangchain,
    constructGraphs,
    getEndingNode,
    getStartingNodes,
    getUserHome,
    replaceInputsWithConfig,
    resolveVariables,
    databaseEntities
} from './utils'
import { DataSource } from 'typeorm'
import { ChatFlow } from './entity/ChatFlow'
import { ChatMessage } from './entity/ChatMessage'
import { Tool } from './entity/Tool'
import { Credential } from './entity/Credential'
import logger from './utils/logger'

export class ChildProcess {
    /**
     * Stop child process when app is killed
     */
    static async stopChildProcess() {
        setTimeout(() => {
            process.exit(0)
        }, 50000)
    }

    /**
     * Process prediction
     * @param {IRunChatflowMessageValue} messageValue
     * @return {Promise<void>}
     */
    async runChildProcess(messageValue: IRunChatflowMessageValue): Promise<void> {
        process.on('SIGTERM', ChildProcess.stopChildProcess)
        process.on('SIGINT', ChildProcess.stopChildProcess)

        await sendToParentProcess('start', '_')

        try {
            const childAppDataSource = await initDB()

            // Create a Queue and add our initial node in it
            const { endingNodeData, chatflow, chatId, incomingInput, componentNodes } = messageValue

            let nodeToExecuteData: INodeData
            let addToChatFlowPool: any = {}

            /* Don't rebuild the flow (to avoid duplicated upsert, recomputation) when all these conditions met:
             * - Node Data already exists in pool
             * - Still in sync (i.e the flow has not been modified since)
             * - Existing overrideConfig and new overrideConfig are the same
             * - Flow doesn't start with nodes that depend on incomingInput.question
             ***/
            if (endingNodeData) {
                nodeToExecuteData = endingNodeData
            } else {
                /*** Get chatflows and prepare data  ***/
                const flowData = chatflow.flowData
                const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
                const nodes = parsedFlowData.nodes
                const edges = parsedFlowData.edges

                /*** Get Ending Node with Directed Graph  ***/
                const { graph, nodeDependencies } = constructGraphs(nodes, edges)
                const directedGraph = graph
                const endingNodeId = getEndingNode(nodeDependencies, directedGraph)
                if (!endingNodeId) {
                    await sendToParentProcess('error', `Ending node ${endingNodeId} not found`)
                    return
                }

                const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
                if (!endingNodeData) {
                    await sendToParentProcess('error', `Ending node ${endingNodeId} data not found`)
                    return
                }

                if (endingNodeData && endingNodeData.category !== 'Chains' && endingNodeData.category !== 'Agents') {
                    await sendToParentProcess('error', `Ending node must be either a Chain or Agent`)
                    return
                }

                if (
                    endingNodeData.outputs &&
                    Object.keys(endingNodeData.outputs).length &&
                    !Object.values(endingNodeData.outputs).includes(endingNodeData.name)
                ) {
                    await sendToParentProcess(
                        'error',
                        `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                    )
                    return
                }

                /*** Get Starting Nodes with Non-Directed Graph ***/
                const constructedObj = constructGraphs(nodes, edges, true)
                const nonDirectedGraph = constructedObj.graph
                const { startingNodeIds, depthQueue } = getStartingNodes(nonDirectedGraph, endingNodeId)

                logger.debug(`[server] [mode:child]: Start building chatflow ${chatflow.id}`)
                /*** BFS to traverse from Starting Nodes to Ending Node ***/
                const reactFlowNodes = await buildLangchain(
                    startingNodeIds,
                    nodes,
                    graph,
                    depthQueue,
                    componentNodes,
                    incomingInput.question,
                    chatId,
                    childAppDataSource,
                    incomingInput?.overrideConfig
                )

                const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
                if (!nodeToExecute) {
                    await sendToParentProcess('error', `Node ${endingNodeId} not found`)
                    return
                }

                if (incomingInput.overrideConfig)
                    nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
                const reactFlowNodeData: INodeData = resolveVariables(nodeToExecute.data, reactFlowNodes, incomingInput.question)
                nodeToExecuteData = reactFlowNodeData

                const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))
                addToChatFlowPool = {
                    chatflowid: chatflow.id,
                    nodeToExecuteData,
                    startingNodes,
                    overrideConfig: incomingInput?.overrideConfig
                }
            }

            const nodeInstanceFilePath = componentNodes[nodeToExecuteData.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const nodeInstance = new nodeModule.nodeClass()

            logger.debug(`[server] [mode:child]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)
            const result = await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                chatHistory: incomingInput.history,
                appDataSource: childAppDataSource,
                databaseEntities
            })
            logger.debug(`[server] [mode:child]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

            await sendToParentProcess('finish', { result, addToChatFlowPool })
        } catch (e: any) {
            await sendToParentProcess('error', e.message)
            logger.error('[server] [mode:child]: Error:', e)
        }
    }
}

/**
 * Initialize DB in child process
 * @returns {DataSource}
 */
async function initDB() {
    let childAppDataSource
    let homePath
    const synchronize = process.env.OVERRIDE_DATABASE === 'false' ? false : true
    switch (process.env.DATABASE_TYPE) {
        case 'sqlite':
            homePath = process.env.DATABASE_PATH ?? path.join(getUserHome(), '.flowise')
            childAppDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize,
                entities: [ChatFlow, ChatMessage, Tool, Credential],
                migrations: []
            })
            break
        case 'mysql':
            childAppDataSource = new DataSource({
                type: 'mysql',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                charset: 'utf8mb4',
                synchronize,
                entities: [ChatFlow, ChatMessage, Tool, Credential],
                migrations: []
            })
            break
        case 'postgres':
            childAppDataSource = new DataSource({
                type: 'postgres',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '5432'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                synchronize,
                entities: [ChatFlow, ChatMessage, Tool, Credential],
                migrations: []
            })
            break
        default:
            homePath = process.env.DATABASE_PATH ?? path.join(getUserHome(), '.flowise')
            childAppDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize,
                entities: [ChatFlow, ChatMessage, Tool, Credential],
                migrations: []
            })
            break
    }

    return await childAppDataSource.initialize()
}

/**
 * Send data back to parent process
 * @param {string} key Key of message
 * @param {*} value Value of message
 * @returns {Promise<void>}
 */
async function sendToParentProcess(key: string, value: any): Promise<void> {
    // tslint:disable-line:no-any
    return new Promise((resolve, reject) => {
        process.send!(
            {
                key,
                value
            },
            (error: Error) => {
                if (error) {
                    return reject(error)
                }
                resolve()
            }
        )
    })
}

const childProcess = new ChildProcess()

process.on('message', async (message: IChildProcessMessage) => {
    if (message.key === 'start') {
        await childProcess.runChildProcess(message.value)
        process.exit()
    }
})
