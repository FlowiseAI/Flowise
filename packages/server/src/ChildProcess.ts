import { IChildProcessMessage, IReactFlowNode, IReactFlowObject, IRunChatflowMessageValue, INodeData } from './Interface'
import { buildLangchain, constructGraphs, getEndingNode, getStartingNodes, resolveVariables } from './utils'

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

        // Create a Queue and add our initial node in it
        const { endingNodeData, chatflow, incomingInput, componentNodes } = messageValue

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
                await sendToParentProcess('error', `Ending node must be either a Chain or Agent`)
                return
            }

            const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
            if (!endingNodeData) {
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

            /*** BFS to traverse from Starting Nodes to Ending Node ***/
            const reactFlowNodes = await buildLangchain(
                startingNodeIds,
                nodes,
                graph,
                depthQueue,
                componentNodes,
                incomingInput.question,
                incomingInput?.overrideConfig
            )

            const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
            if (!nodeToExecute) {
                await sendToParentProcess('error', `Node ${endingNodeId} not found`)
                return
            }

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

        const result = await nodeInstance.run(nodeToExecuteData, incomingInput.question, { chatHistory: incomingInput.history })

        await sendToParentProcess('finish', { result, addToChatFlowPool })
    }
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
