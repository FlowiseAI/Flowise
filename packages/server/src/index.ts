import express, { Request, Response } from 'express'
import path from 'path'
import cors from 'cors'
import http from 'http'
import * as fs from 'fs'

import { IChatFlow, IncomingInput, IReactFlowNode, IReactFlowObject } from './Interface'
import { getNodeModulesPackagePath, getStartingNodes, buildLangchain, getEndingNode, constructGraphs } from './utils'
import { cloneDeep } from 'lodash'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { ChatFlow } from './entity/ChatFlow'
import { ChatMessage } from './entity/ChatMessage'
import { ChatflowPool } from './ChatflowPool'
import { INodeData } from 'flowise-components'

export class App {
    app: express.Application
    nodesPool: NodesPool
    chatflowPool: ChatflowPool
    AppDataSource = getDataSource()

    constructor() {
        this.app = express()
    }

    async initDatabase() {
        // Initialize database
        this.AppDataSource.initialize()
            .then(async () => {
                console.info('📦[server]: Data Source has been initialized!')

                // Initialize pools
                this.nodesPool = new NodesPool()
                await this.nodesPool.initialize()

                this.chatflowPool = new ChatflowPool()
            })
            .catch((err) => {
                console.error('❌[server]: Error during Data Source initialization:', err)
            })
    }

    async config() {
        // Limit is needed to allow sending/receiving base64 encoded string
        this.app.use(express.json({ limit: '50mb' }))
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }))

        // Allow access from ui when yarn run dev
        if (process.env.NODE_ENV !== 'production') {
            this.app.use(cors({ credentials: true, origin: 'http://localhost:8080' }))
        }

        // ----------------------------------------
        // Nodes
        // ----------------------------------------

        // Get all component nodes
        this.app.get('/api/v1/nodes', (req: Request, res: Response) => {
            const returnData = []
            for (const nodeName in this.nodesPool.componentNodes) {
                const clonedNode = cloneDeep(this.nodesPool.componentNodes[nodeName])
                returnData.push(clonedNode)
            }
            return res.json(returnData)
        })

        // Get specific component node via name
        this.app.get('/api/v1/nodes/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                return res.json(this.nodesPool.componentNodes[req.params.name])
            } else {
                throw new Error(`Node ${req.params.name} not found`)
            }
        })

        // Returns specific component node icon via name
        this.app.get('/api/v1/node-icon/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                const nodeInstance = this.nodesPool.componentNodes[req.params.name]
                if (nodeInstance.icon === undefined) {
                    throw new Error(`Node ${req.params.name} icon not found`)
                }

                if (nodeInstance.icon.endsWith('.svg') || nodeInstance.icon.endsWith('.png') || nodeInstance.icon.endsWith('.jpg')) {
                    const filepath = nodeInstance.icon
                    res.sendFile(filepath)
                } else {
                    throw new Error(`Node ${req.params.name} icon is missing icon`)
                }
            } else {
                throw new Error(`Node ${req.params.name} not found`)
            }
        })

        // ----------------------------------------
        // Chatflows
        // ----------------------------------------

        // Get all chatflows
        this.app.get('/api/v1/chatflows', async (req: Request, res: Response) => {
            const chatflows: IChatFlow[] = await this.AppDataSource.getRepository(ChatFlow).find()
            return res.json(chatflows)
        })

        // Get specific chatflow via id
        this.app.get('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (chatflow) return res.json(chatflow)
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        })

        // Save chatflow
        this.app.post('/api/v1/chatflows', async (req: Request, res: Response) => {
            const body = req.body
            const newChatFlow = new ChatFlow()
            Object.assign(newChatFlow, body)

            const chatflow = this.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            const results = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

            return res.json(results)
        })

        // Update chatflow
        this.app.put('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })

            if (!chatflow) {
                res.status(404).send(`Chatflow ${req.params.id} not found`)
                return
            }

            const body = req.body
            const updateChatFlow = new ChatFlow()
            Object.assign(updateChatFlow, body)

            this.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
            const result = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // Update chatflowpool inSync to false, to build Langchain again because data has been changed
            this.chatflowPool.updateInSync(chatflow.id, false)

            return res.json(result)
        })

        // Delete chatflow via id
        this.app.delete('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(ChatFlow).delete({ id: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // ChatMessage
        // ----------------------------------------

        // Get all chatmessages from chatflowid
        this.app.get('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const chatmessages = await this.AppDataSource.getRepository(ChatMessage).findBy({
                chatflowid: req.params.id
            })
            return res.json(chatmessages)
        })

        // Add chatmessages for chatflowid
        this.app.post('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const body = req.body
            const newChatMessage = new ChatMessage()
            Object.assign(newChatMessage, body)

            const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
            const results = await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)

            return res.json(results)
        })

        // Delete all chatmessages from chatflowid
        this.app.delete('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // Prediction
        // ----------------------------------------

        // Send input message and get prediction result
        this.app.post('/api/v1/prediction/:id', async (req: Request, res: Response) => {
            try {
                const chatflowid = req.params.id
                const incomingInput: IncomingInput = req.body

                let nodeToExecuteData: INodeData

                if (
                    Object.prototype.hasOwnProperty.call(this.chatflowPool.activeChatflows, chatflowid) &&
                    this.chatflowPool.activeChatflows[chatflowid].inSync
                ) {
                    nodeToExecuteData = this.chatflowPool.activeChatflows[chatflowid].endingNodeData
                } else {
                    const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                        id: chatflowid
                    })
                    if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

                    const flowData = chatflow.flowData
                    const parsedFlowData: IReactFlowObject = JSON.parse(flowData)

                    /*** Get Ending Node with Directed Graph  ***/
                    const { graph, nodeDependencies } = constructGraphs(parsedFlowData.nodes, parsedFlowData.edges)
                    const directedGraph = graph
                    const endingNodeId = getEndingNode(nodeDependencies, directedGraph)
                    if (!endingNodeId) return res.status(500).send(`Ending node must be either a Chain or Agent`)

                    /*** Get Starting Nodes with Non-Directed Graph ***/
                    const constructedObj = constructGraphs(parsedFlowData.nodes, parsedFlowData.edges, true)
                    const nonDirectedGraph = constructedObj.graph
                    const { startingNodeIds, depthQueue } = getStartingNodes(nonDirectedGraph, endingNodeId)

                    /*** BFS to traverse from Starting Nodes to Ending Node ***/
                    const reactFlowNodes = await buildLangchain(
                        startingNodeIds,
                        parsedFlowData.nodes,
                        graph,
                        depthQueue,
                        this.nodesPool.componentNodes
                    )

                    const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
                    if (!nodeToExecute) return res.status(404).send(`Node ${endingNodeId} not found`)

                    nodeToExecuteData = nodeToExecute.data

                    this.chatflowPool.add(chatflowid, nodeToExecuteData)
                }

                const nodeInstanceFilePath = this.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
                const nodeModule = await import(nodeInstanceFilePath)
                const nodeInstance = new nodeModule.nodeClass()

                const result = await nodeInstance.run(nodeToExecuteData, incomingInput.question, { chatHistory: incomingInput.history })

                return res.json(result)
            } catch (e: any) {
                return res.status(500).send(e.message)
            }
        })

        // ----------------------------------------
        // Marketplaces
        // ----------------------------------------

        // Get all chatflows for marketplaces
        this.app.get('/api/v1/marketplaces', async (req: Request, res: Response) => {
            const marketplaceDir = path.join(__dirname, '..', 'marketplaces')
            const jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            const templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    id: index,
                    name: file.split('.json')[0],
                    flowData: fileData.toString(),
                    description: fileDataObj?.description || ''
                }
                templates.push(template)
            })
            return res.json(templates)
        })

        // ----------------------------------------
        // Serve UI static
        // ----------------------------------------

        const packagePath = getNodeModulesPackagePath('flowise-ui')
        const uiBuildPath = path.join(packagePath, 'build')
        const uiHtmlPath = path.join(packagePath, 'build', 'index.html')

        this.app.use('/', express.static(uiBuildPath))

        // All other requests not handled will return React app
        this.app.use((req, res) => {
            res.sendFile(uiHtmlPath)
        })
    }

    async stopApp() {
        try {
            const removePromises: any[] = []
            await Promise.all(removePromises)
        } catch (e) {
            console.error(`❌[server]: Flowise Server shut down error: ${e}`)
        }
    }
}

let serverApp: App | undefined

export async function start(): Promise<void> {
    serverApp = new App()

    const port = parseInt(process.env.PORT || '', 10) || 3000
    const server = http.createServer(serverApp.app)

    await serverApp.initDatabase()
    await serverApp.config()

    server.listen(port, () => {
        console.info(`⚡️[server]: Flowise Server is listening at ${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
