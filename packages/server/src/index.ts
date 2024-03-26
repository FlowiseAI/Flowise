import express, { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import http from 'http'
import * as fs from 'fs'
import basicAuth from 'express-basic-auth'
import contentDisposition from 'content-disposition'
import { Server } from 'socket.io'
import logger from './utils/logger'
import { expressRequestLogger } from './utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { DataSource } from 'typeorm'
import {
    IChatFlow,
    IncomingInput,
    IReactFlowNode,
    IReactFlowObject,
    INodeData,
    chatType,
    IChatMessage,
    IDepthQueue,
    INodeDirectedGraph,
    IUploadFileSizeAndTypes
} from './Interface'
import {
    getNodeModulesPackagePath,
    getStartingNodes,
    buildFlow,
    getEndingNodes,
    constructGraphs,
    resolveVariables,
    isStartNodeDependOnInput,
    mapMimeTypeToInputField,
    findAvailableConfigs,
    isSameOverrideConfig,
    isFlowValidForStream,
    databaseEntities,
    replaceInputsWithConfig,
    getEncryptionKey,
    getMemorySessionId,
    getUserHome,
    getSessionChatHistory,
    getAllConnectedNodes,
    findMemoryNode,
    getTelemetryFlowObj,
    getAppVersion
} from './utils'
import { omit } from 'lodash'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { ChatFlow } from './database/entities/ChatFlow'
import { ChatMessage } from './database/entities/ChatMessage'
import { ChatflowPool } from './ChatflowPool'
import { CachePool } from './CachePool'
import {
    ICommonObject,
    IMessage,
    INodeParams,
    convertSpeechToText,
    xmlScrape,
    webCrawl,
    getStoragePath,
    IFileUpload
} from 'flowise-components'
import { getRateLimiter, initializeRateLimiter } from './utils/rateLimit'
import { compareKeys, getApiKey, getAPIKeys } from './utils/apiKey'
import { sanitizeMiddleware, getCorsOptions, getAllowedIframeOrigins } from './utils/XSS'
import axios from 'axios'
import { Client } from 'langchainhub'
import { parsePrompt } from './utils/hub'
import { Telemetry } from './utils/telemetry'
import flowiseApiV1Router from './routes'

export class App {
    app: express.Application
    nodesPool: NodesPool
    chatflowPool: ChatflowPool
    cachePool: CachePool
    telemetry: Telemetry
    AppDataSource: DataSource = getDataSource()

    constructor() {
        this.app = express()
    }

    async initDatabase() {
        // Initialize database
        this.AppDataSource.initialize()
            .then(async () => {
                logger.info('📦 [server]: Data Source is being initialized!')

                // Run Migrations Scripts
                await this.AppDataSource.runMigrations({ transaction: 'each' })

                // Initialize nodes pool
                this.nodesPool = new NodesPool()
                await this.nodesPool.initialize()

                // Initialize chatflow pool
                this.chatflowPool = new ChatflowPool()

                // Initialize API keys
                await getAPIKeys()

                // Initialize encryption key
                await getEncryptionKey()

                // Initialize Rate Limit
                const AllChatFlow: IChatFlow[] = await getAllChatFlow()
                await initializeRateLimiter(AllChatFlow)

                // Initialize cache pool
                this.cachePool = new CachePool()

                // Initialize telemetry
                this.telemetry = new Telemetry()
                logger.info('📦 [server]: Data Source has been initialized!')
            })
            .catch((err) => {
                logger.error('❌ [server]: Error during Data Source initialization:', err)
            })
    }

    async config(socketIO?: Server) {
        // Limit is needed to allow sending/receiving base64 encoded string
        const flowise_file_size_limit = process.env.FLOWISE_FILE_SIZE_LIMIT ?? '50mb'
        this.app.use(express.json({ limit: flowise_file_size_limit }))
        this.app.use(express.urlencoded({ limit: flowise_file_size_limit, extended: true }))

        if (process.env.NUMBER_OF_PROXIES && parseInt(process.env.NUMBER_OF_PROXIES) > 0)
            this.app.set('trust proxy', parseInt(process.env.NUMBER_OF_PROXIES))

        // Allow access from specified domains
        this.app.use(cors(getCorsOptions()))

        // Allow embedding from specified domains.
        this.app.use((req, res, next) => {
            const allowedOrigins = getAllowedIframeOrigins()
            if (allowedOrigins == '*') {
                next()
            } else {
                const csp = `frame-ancestors ${allowedOrigins}`
                res.setHeader('Content-Security-Policy', csp)
                next()
            }
        })

        // Switch off the default 'X-Powered-By: Express' header
        this.app.disable('x-powered-by')

        // Add the expressRequestLogger middleware to log all requests
        this.app.use(expressRequestLogger)

        // Add the sanitizeMiddleware to guard against XSS
        this.app.use(sanitizeMiddleware)

        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            const username = process.env.FLOWISE_USERNAME
            const password = process.env.FLOWISE_PASSWORD
            const basicAuthMiddleware = basicAuth({
                users: { [username]: password }
            })
            const whitelistURLs = [
                '/api/v1/verify/apikey/',
                '/api/v1/chatflows/apikey/',
                '/api/v1/public-chatflows',
                '/api/v1/public-chatbotConfig',
                '/api/v1/prediction/',
                '/api/v1/vector/upsert/',
                '/api/v1/node-icon/',
                '/api/v1/components-credentials-icon/',
                '/api/v1/chatflows-streaming',
                '/api/v1/chatflows-uploads',
                '/api/v1/openai-assistants-file',
                '/api/v1/feedback',
                '/api/v1/get-upload-file',
                '/api/v1/ip'
            ]
            this.app.use((req, res, next) => {
                if (req.url.includes('/api/v1/')) {
                    whitelistURLs.some((url) => req.url.includes(url)) ? next() : basicAuthMiddleware(req, res, next)
                } else next()
            })
        }

        const upload = multer({ dest: `${path.join(__dirname, '..', 'uploads')}/` })

        function streamFileToUser(res: Response, filePath: string) {
            const fileStream = fs.createReadStream(filePath)
            fileStream.pipe(res)
        }

        // Download file from assistant
        this.app.post('/api/v1/openai-assistants-file', async (req: Request, res: Response) => {
            const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', req.body.fileName)
            //raise error if file path is not absolute
            if (!path.isAbsolute(filePath)) return res.status(500).send(`Invalid file path`)
            //raise error if file path contains '..'
            if (filePath.includes('..')) return res.status(500).send(`Invalid file path`)
            //only return from the .flowise openai-assistant folder
            if (!(filePath.includes('.flowise') && filePath.includes('openai-assistant'))) return res.status(500).send(`Invalid file path`)

            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Disposition', contentDisposition(path.basename(filePath)))
                streamFileToUser(res, filePath)
            } else {
                return res.status(404).send(`File ${req.body.fileName} not found`)
            }
        })

        this.app.get('/api/v1/get-upload-path', async (req: Request, res: Response) => {
            return res.json({
                storagePath: getStoragePath()
            })
        })

        // stream uploaded image
        this.app.get('/api/v1/get-upload-file', async (req: Request, res: Response) => {
            try {
                if (!req.query.chatflowId || !req.query.chatId || !req.query.fileName) {
                    return res.status(500).send(`Invalid file path`)
                }
                const chatflowId = req.query.chatflowId as string
                const chatId = req.query.chatId as string
                const fileName = req.query.fileName as string

                const filePath = path.join(getStoragePath(), chatflowId, chatId, fileName)
                //raise error if file path is not absolute
                if (!path.isAbsolute(filePath)) return res.status(500).send(`Invalid file path`)
                //raise error if file path contains '..'
                if (filePath.includes('..')) return res.status(500).send(`Invalid file path`)
                //only return from the storage folder
                if (!filePath.startsWith(getStoragePath())) return res.status(500).send(`Invalid file path`)

                if (fs.existsSync(filePath)) {
                    res.setHeader('Content-Disposition', contentDisposition(path.basename(filePath)))
                    streamFileToUser(res, filePath)
                } else {
                    return res.status(404).send(`File ${fileName} not found`)
                }
            } catch (error) {
                return res.status(500).send(`Invalid file path`)
            }
        })

        // ----------------------------------------
        // Configuration
        // ----------------------------------------

        this.app.get('/api/v1/flow-config/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const availableConfigs = findAvailableConfigs(nodes, this.nodesPool.componentCredentials)
            return res.json(availableConfigs)
        })

        this.app.post('/api/v1/node-config', async (req: Request, res: Response) => {
            const nodes = [{ data: req.body }] as IReactFlowNode[]
            const availableConfigs = findAvailableConfigs(nodes, this.nodesPool.componentCredentials)
            return res.json(availableConfigs)
        })

        this.app.get('/api/v1/version', async (req: Request, res: Response) => {
            const getPackageJsonPath = (): string => {
                const checkPaths = [
                    path.join(__dirname, '..', 'package.json'),
                    path.join(__dirname, '..', '..', 'package.json'),
                    path.join(__dirname, '..', '..', '..', 'package.json'),
                    path.join(__dirname, '..', '..', '..', '..', 'package.json'),
                    path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
                ]
                for (const checkPath of checkPaths) {
                    if (fs.existsSync(checkPath)) {
                        return checkPath
                    }
                }
                return ''
            }

            const packagejsonPath = getPackageJsonPath()
            if (!packagejsonPath) return res.status(404).send('Version not found')
            try {
                const content = await fs.promises.readFile(packagejsonPath, 'utf8')
                const parsedContent = JSON.parse(content)
                return res.json({ version: parsedContent.version })
            } catch (error) {
                return res.status(500).send(`Version not found: ${error}`)
            }
        })

        // ----------------------------------------
        // Scraper
        // ----------------------------------------

        this.app.get('/api/v1/fetch-links', async (req: Request, res: Response) => {
            try {
                const url = decodeURIComponent(req.query.url as string)
                const relativeLinksMethod = req.query.relativeLinksMethod as string
                if (!relativeLinksMethod) {
                    return res.status(500).send('Please choose a Relative Links Method in Additional Parameters.')
                }

                const limit = parseInt(req.query.limit as string)
                if (process.env.DEBUG === 'true') console.info(`Start ${relativeLinksMethod}`)
                const links: string[] = relativeLinksMethod === 'webCrawl' ? await webCrawl(url, limit) : await xmlScrape(url, limit)
                if (process.env.DEBUG === 'true') console.info(`Finish ${relativeLinksMethod}`)

                res.json({ status: 'OK', links })
            } catch (e: any) {
                return res.status(500).send('Could not fetch links from the URL.')
            }
        })

        // ----------------------------------------
        // Upsert
        // ----------------------------------------

        this.app.post(
            '/api/v1/vector/upsert/:id',
            upload.array('files'),
            (req: Request, res: Response, next: NextFunction) => getRateLimiter(req, res, next),
            async (req: Request, res: Response) => {
                await this.upsertVector(req, res)
            }
        )

        this.app.post('/api/v1/vector/internal-upsert/:id', async (req: Request, res: Response) => {
            await this.upsertVector(req, res, true)
        })

        // ----------------------------------------
        // Prompt from Hub
        // ----------------------------------------
        this.app.post('/api/v1/load-prompt', async (req: Request, res: Response) => {
            try {
                let hub = new Client()
                const prompt = await hub.pull(req.body.promptName)
                const templates = parsePrompt(prompt)
                return res.json({ status: 'OK', prompt: req.body.promptName, templates: templates })
            } catch (e: any) {
                return res.json({ status: 'ERROR', prompt: req.body.promptName, error: e?.message })
            }
        })

        this.app.post('/api/v1/prompts-list', async (req: Request, res: Response) => {
            try {
                const tags = req.body.tags ? `tags=${req.body.tags}` : ''
                // Default to 100, TODO: add pagination and use offset & limit
                const url = `https://api.hub.langchain.com/repos/?limit=100&${tags}has_commits=true&sort_field=num_likes&sort_direction=desc&is_archived=false`
                axios.get(url).then((response) => {
                    if (response.data.repos) {
                        return res.json({ status: 'OK', repos: response.data.repos })
                    }
                })
            } catch (e: any) {
                return res.json({ status: 'ERROR', repos: [] })
            }
        })

        // ----------------------------------------
        // Prediction
        // ----------------------------------------

        // Send input message and get prediction result (External)
        this.app.post(
            '/api/v1/prediction/:id',
            upload.array('files'),
            (req: Request, res: Response, next: NextFunction) => getRateLimiter(req, res, next),
            async (req: Request, res: Response) => {
                const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                    id: req.params.id
                })
                if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)
                let isDomainAllowed = true
                logger.info(`[server]: Request originated from ${req.headers.origin}`)
                if (chatflow.chatbotConfig) {
                    const parsedConfig = JSON.parse(chatflow.chatbotConfig)
                    // check whether the first one is not empty. if it is empty that means the user set a value and then removed it.
                    const isValidAllowedOrigins = parsedConfig.allowedOrigins?.length && parsedConfig.allowedOrigins[0] !== ''
                    if (isValidAllowedOrigins) {
                        const originHeader = req.headers.origin as string
                        const origin = new URL(originHeader).host
                        isDomainAllowed =
                            parsedConfig.allowedOrigins.filter((domain: string) => {
                                try {
                                    const allowedOrigin = new URL(domain).host
                                    return origin === allowedOrigin
                                } catch (e) {
                                    return false
                                }
                            }).length > 0
                    }
                }

                if (isDomainAllowed) {
                    await this.buildChatflow(req, res, socketIO)
                } else {
                    return res.status(401).send(`This site is not allowed to access this chatbot`)
                }
            }
        )

        // Send input message and get prediction result (Internal)
        this.app.post('/api/v1/internal-prediction/:id', async (req: Request, res: Response) => {
            await this.buildChatflow(req, res, socketIO, true)
        })

        // ----------------------------------------
        // Marketplaces
        // ----------------------------------------

        // Get all templates for marketplaces
        this.app.get('/api/v1/marketplaces/templates', async (req: Request, res: Response) => {
            let marketplaceDir = path.join(__dirname, '..', 'marketplaces', 'chatflows')
            let jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            let templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', 'chatflows', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    id: index,
                    templateName: file.split('.json')[0],
                    flowData: fileData.toString(),
                    badge: fileDataObj?.badge,
                    framework: fileDataObj?.framework,
                    categories: fileDataObj?.categories,
                    type: 'Chatflow',
                    description: fileDataObj?.description || ''
                }
                templates.push(template)
            })

            marketplaceDir = path.join(__dirname, '..', 'marketplaces', 'tools')
            jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', 'tools', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    ...fileDataObj,
                    id: index,
                    type: 'Tool',
                    framework: fileDataObj?.framework,
                    badge: fileDataObj?.badge,
                    categories: '',
                    templateName: file.split('.json')[0]
                }
                templates.push(template)
            })
            const sortedTemplates = templates.sort((a, b) => a.templateName.localeCompare(b.templateName))
            const FlowiseDocsQnAIndex = sortedTemplates.findIndex((tmp) => tmp.templateName === 'Flowise Docs QnA')
            if (FlowiseDocsQnAIndex > 0) {
                sortedTemplates.unshift(sortedTemplates.splice(FlowiseDocsQnAIndex, 1)[0])
            }
            return res.json(sortedTemplates)
        })

        // ----------------------------------------
        // API Keys
        // ----------------------------------------

        // Verify api key
        this.app.get('/api/v1/verify/apikey/:apiKey', async (req: Request, res: Response) => {
            try {
                const apiKey = await getApiKey(req.params.apiKey)
                if (!apiKey) return res.status(401).send('Unauthorized')
                return res.status(200).send('OK')
            } catch (err: any) {
                return res.status(500).send(err?.message)
            }
        })

        this.app.use('/api/v1', flowiseApiV1Router)

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

    /**
     * Validate API Key
     * @param {Request} req
     * @param {Response} res
     * @param {ChatFlow} chatflow
     */
    async validateKey(req: Request, chatflow: ChatFlow) {
        const chatFlowApiKeyId = chatflow.apikeyid
        if (!chatFlowApiKeyId) return true

        const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
        if (chatFlowApiKeyId && !authorizationHeader) return false

        const suppliedKey = authorizationHeader.split(`Bearer `).pop()
        if (suppliedKey) {
            const keys = await getAPIKeys()
            const apiSecret = keys.find((key) => key.id === chatFlowApiKeyId)?.apiSecret
            if (!compareKeys(apiSecret, suppliedKey)) return false
            return true
        }
        return false
    }

    /**
     * Method that checks if uploads are enabled in the chatflow
     * @param {string} chatflowid
     */
    async getUploadsConfig(chatflowid: string): Promise<any> {
        const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) return `Chatflow ${chatflowid} not found`

        const uploadAllowedNodes = ['llmChain', 'conversationChain', 'mrklAgentChat', 'conversationalAgent']
        const uploadProcessingNodes = ['chatOpenAI', 'chatAnthropic', 'awsChatBedrock', 'azureChatOpenAI']

        const flowObj = JSON.parse(chatflow.flowData)
        const imgUploadSizeAndTypes: IUploadFileSizeAndTypes[] = []

        let isSpeechToTextEnabled = false
        if (chatflow.speechToText) {
            const speechToTextProviders = JSON.parse(chatflow.speechToText)
            for (const provider in speechToTextProviders) {
                if (provider !== 'none') {
                    const providerObj = speechToTextProviders[provider]
                    if (providerObj.status) {
                        isSpeechToTextEnabled = true
                        break
                    }
                }
            }
        }

        let isImageUploadAllowed = false
        const nodes: IReactFlowNode[] = flowObj.nodes

        /*
         * Condition for isImageUploadAllowed
         * 1.) one of the uploadAllowedNodes exists
         * 2.) one of the uploadProcessingNodes exists + allowImageUploads is ON
         */
        if (!nodes.some((node) => uploadAllowedNodes.includes(node.data.name))) {
            return {
                isSpeechToTextEnabled,
                isImageUploadAllowed: false,
                imgUploadSizeAndTypes
            }
        }

        nodes.forEach((node: IReactFlowNode) => {
            if (uploadProcessingNodes.indexOf(node.data.name) > -1) {
                // TODO: for now the maxUploadSize is hardcoded to 5MB, we need to add it to the node properties
                node.data.inputParams.map((param: INodeParams) => {
                    if (param.name === 'allowImageUploads' && node.data.inputs?.['allowImageUploads']) {
                        imgUploadSizeAndTypes.push({
                            fileTypes: 'image/gif;image/jpeg;image/png;image/webp;'.split(';'),
                            maxUploadSize: 5
                        })
                        isImageUploadAllowed = true
                    }
                })
            }
        })

        return {
            isSpeechToTextEnabled,
            isImageUploadAllowed,
            imgUploadSizeAndTypes
        }
    }

    /**
     * Method that add chat messages.
     * @param {Partial<IChatMessage>} chatMessage
     */
    async addChatMessage(chatMessage: Partial<IChatMessage>): Promise<ChatMessage> {
        const newChatMessage = new ChatMessage()
        Object.assign(newChatMessage, chatMessage)

        if (!newChatMessage.createdDate) newChatMessage.createdDate = new Date()

        const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
        return await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)
    }

    async upsertVector(req: Request, res: Response, isInternal: boolean = false) {
        try {
            const chatflowid = req.params.id
            let incomingInput: IncomingInput = req.body

            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            if (!isInternal) {
                const isKeyValidated = await this.validateKey(req, chatflow)
                if (!isKeyValidated) return res.status(401).send('Unauthorized')
            }

            const files = (req.files as any[]) || []

            if (files.length) {
                const overrideConfig: ICommonObject = { ...req.body }
                for (const file of files) {
                    const fileData = fs.readFileSync(file.path, { encoding: 'base64' })
                    const dataBase64String = `data:${file.mimetype};base64,${fileData},filename:${file.filename}`

                    const fileInputField = mapMimeTypeToInputField(file.mimetype)
                    if (overrideConfig[fileInputField]) {
                        overrideConfig[fileInputField] = JSON.stringify([...JSON.parse(overrideConfig[fileInputField]), dataBase64String])
                    } else {
                        overrideConfig[fileInputField] = JSON.stringify([dataBase64String])
                    }
                }
                incomingInput = {
                    question: req.body.question ?? 'hello',
                    overrideConfig,
                    history: [],
                    stopNodeId: req.body.stopNodeId
                }
            }

            /*** Get chatflows and prepare data  ***/
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const edges = parsedFlowData.edges

            let stopNodeId = incomingInput?.stopNodeId ?? ''
            let chatHistory = incomingInput?.history
            let chatId = incomingInput.chatId ?? ''
            let isUpsert = true

            // Get session ID
            const memoryNode = findMemoryNode(nodes, edges)
            let sessionId = undefined
            if (memoryNode) sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

            const vsNodes = nodes.filter(
                (node) =>
                    node.data.category === 'Vector Stores' &&
                    !node.data.label.includes('Upsert') &&
                    !node.data.label.includes('Load Existing')
            )
            if (vsNodes.length > 1 && !stopNodeId) {
                return res.status(500).send('There are multiple vector nodes, please provide stopNodeId in body request')
            } else if (vsNodes.length === 1 && !stopNodeId) {
                stopNodeId = vsNodes[0].data.id
            } else if (!vsNodes.length && !stopNodeId) {
                return res.status(500).send('No vector node found')
            }

            const { graph } = constructGraphs(nodes, edges, { isReversed: true })

            const nodeIds = getAllConnectedNodes(graph, stopNodeId)

            const filteredGraph: INodeDirectedGraph = {}
            for (const key of nodeIds) {
                if (Object.prototype.hasOwnProperty.call(graph, key)) {
                    filteredGraph[key] = graph[key]
                }
            }

            const { startingNodeIds, depthQueue } = getStartingNodes(filteredGraph, stopNodeId)

            await buildFlow(
                startingNodeIds,
                nodes,
                edges,
                filteredGraph,
                depthQueue,
                this.nodesPool.componentNodes,
                incomingInput.question,
                chatHistory,
                chatId,
                sessionId ?? '',
                chatflowid,
                this.AppDataSource,
                incomingInput?.overrideConfig,
                this.cachePool,
                isUpsert,
                stopNodeId
            )

            const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.data.id))

            this.chatflowPool.add(chatflowid, undefined, startingNodes, incomingInput?.overrideConfig)

            await this.telemetry.sendTelemetry('vector_upserted', {
                version: await getAppVersion(),
                chatflowId: chatflowid,
                type: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                flowGraph: getTelemetryFlowObj(nodes, edges),
                stopNodeId
            })

            return res.status(201).send('Successfully Upserted')
        } catch (e: any) {
            logger.error('[server]: Error:', e)
            return res.status(500).send(e.message)
        }
    }

    /**
     * Build Chatflow
     * @param {Request} req
     * @param {Response} res
     * @param {Server} socketIO
     * @param {boolean} isInternal
     * @param {boolean} isUpsert
     */
    async buildChatflow(req: Request, res: Response, socketIO?: Server, isInternal: boolean = false) {
        try {
            const chatflowid = req.params.id
            let incomingInput: IncomingInput = req.body

            let nodeToExecuteData: INodeData

            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
            const userMessageDateTime = new Date()

            if (!isInternal) {
                const isKeyValidated = await this.validateKey(req, chatflow)
                if (!isKeyValidated) return res.status(401).send('Unauthorized')
            }

            let fileUploads: IFileUpload[] = []
            if (incomingInput.uploads) {
                fileUploads = incomingInput.uploads
                for (let i = 0; i < fileUploads.length; i += 1) {
                    const upload = fileUploads[i]
                    if ((upload.type === 'file' || upload.type === 'audio') && upload.data) {
                        const filename = upload.name
                        const dir = path.join(getStoragePath(), chatflowid, chatId)
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true })
                        }
                        const filePath = path.join(dir, filename)
                        const splitDataURI = upload.data.split(',')
                        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                        fs.writeFileSync(filePath, bf)

                        // Omit upload.data since we don't store the content in database
                        upload.type = 'stored-file'
                        fileUploads[i] = omit(upload, ['data'])
                    }

                    // Run Speech to Text conversion
                    if (upload.mime === 'audio/webm') {
                        let speechToTextConfig: ICommonObject = {}
                        if (chatflow.speechToText) {
                            const speechToTextProviders = JSON.parse(chatflow.speechToText)
                            for (const provider in speechToTextProviders) {
                                const providerObj = speechToTextProviders[provider]
                                if (providerObj.status) {
                                    speechToTextConfig = providerObj
                                    speechToTextConfig['name'] = provider
                                    break
                                }
                            }
                        }
                        if (speechToTextConfig) {
                            const options: ICommonObject = {
                                chatId,
                                chatflowid,
                                appDataSource: this.AppDataSource,
                                databaseEntities: databaseEntities
                            }
                            const speechToTextResult = await convertSpeechToText(upload, speechToTextConfig, options)
                            if (speechToTextResult) {
                                incomingInput.question = speechToTextResult
                            }
                        }
                    }
                }
            }

            let isStreamValid = false

            const files = (req.files as any[]) || []

            if (files.length) {
                const overrideConfig: ICommonObject = { ...req.body }
                for (const file of files) {
                    const fileData = fs.readFileSync(file.path, { encoding: 'base64' })
                    const dataBase64String = `data:${file.mimetype};base64,${fileData},filename:${file.filename}`

                    const fileInputField = mapMimeTypeToInputField(file.mimetype)
                    if (overrideConfig[fileInputField]) {
                        overrideConfig[fileInputField] = JSON.stringify([...JSON.parse(overrideConfig[fileInputField]), dataBase64String])
                    } else {
                        overrideConfig[fileInputField] = JSON.stringify([dataBase64String])
                    }
                }
                incomingInput = {
                    question: req.body.question ?? 'hello',
                    overrideConfig,
                    history: [],
                    socketIOClientId: req.body.socketIOClientId
                }
            }

            /*** Get chatflows and prepare data  ***/
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const edges = parsedFlowData.edges

            // Get session ID
            const memoryNode = findMemoryNode(nodes, edges)
            const memoryType = memoryNode?.data.label
            let sessionId = undefined
            if (memoryNode) sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

            /*   Reuse the flow without having to rebuild (to avoid duplicated upsert, recomputation, reinitialization of memory) when all these conditions met:
             * - Node Data already exists in pool
             * - Still in sync (i.e the flow has not been modified since)
             * - Existing overrideConfig and new overrideConfig are the same
             * - Flow doesn't start with/contain nodes that depend on incomingInput.question
             * TODO: convert overrideConfig to hash when we no longer store base64 string but filepath
             ***/
            const isFlowReusable = () => {
                return (
                    Object.prototype.hasOwnProperty.call(this.chatflowPool.activeChatflows, chatflowid) &&
                    this.chatflowPool.activeChatflows[chatflowid].inSync &&
                    this.chatflowPool.activeChatflows[chatflowid].endingNodeData &&
                    isSameOverrideConfig(
                        isInternal,
                        this.chatflowPool.activeChatflows[chatflowid].overrideConfig,
                        incomingInput.overrideConfig
                    ) &&
                    !isStartNodeDependOnInput(this.chatflowPool.activeChatflows[chatflowid].startingNodes, nodes)
                )
            }

            if (isFlowReusable()) {
                nodeToExecuteData = this.chatflowPool.activeChatflows[chatflowid].endingNodeData as INodeData
                isStreamValid = isFlowValidForStream(nodes, nodeToExecuteData)
                logger.debug(
                    `[server]: Reuse existing chatflow ${chatflowid} with ending node ${nodeToExecuteData.label} (${nodeToExecuteData.id})`
                )
            } else {
                /*** Get Ending Node with Directed Graph  ***/
                const { graph, nodeDependencies } = constructGraphs(nodes, edges)
                const directedGraph = graph
                const endingNodeIds = getEndingNodes(nodeDependencies, directedGraph)
                if (!endingNodeIds.length) return res.status(500).send(`Ending nodes not found`)

                const endingNodes = nodes.filter((nd) => endingNodeIds.includes(nd.id))

                let isEndingNodeExists = endingNodes.find((node) => node.data?.outputs?.output === 'EndingNode')

                for (const endingNode of endingNodes) {
                    const endingNodeData = endingNode.data
                    if (!endingNodeData) return res.status(500).send(`Ending node ${endingNode.id} data not found`)

                    const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

                    if (!isEndingNode) {
                        if (
                            endingNodeData &&
                            endingNodeData.category !== 'Chains' &&
                            endingNodeData.category !== 'Agents' &&
                            endingNodeData.category !== 'Engine'
                        ) {
                            return res.status(500).send(`Ending node must be either a Chain or Agent`)
                        }

                        if (
                            endingNodeData.outputs &&
                            Object.keys(endingNodeData.outputs).length &&
                            !Object.values(endingNodeData.outputs ?? {}).includes(endingNodeData.name)
                        ) {
                            return res
                                .status(500)
                                .send(
                                    `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                                )
                        }
                    }

                    isStreamValid = isFlowValidForStream(nodes, endingNodeData)
                }

                // Once custom function ending node exists, flow is always unavailable to stream
                isStreamValid = isEndingNodeExists ? false : isStreamValid

                let chatHistory: IMessage[] = incomingInput.history ?? []

                // When {{chat_history}} is used in Prompt Template, fetch the chat conversations from memory node
                for (const endingNode of endingNodes) {
                    const endingNodeData = endingNode.data

                    if (!endingNodeData.inputs?.memory) continue

                    const memoryNodeId = endingNodeData.inputs?.memory.split('.')[0].replace('{{', '')
                    const memoryNode = nodes.find((node) => node.data.id === memoryNodeId)

                    if (!memoryNode) continue

                    if (!chatHistory.length && (incomingInput.chatId || incomingInput.overrideConfig?.sessionId)) {
                        chatHistory = await getSessionChatHistory(
                            memoryNode,
                            this.nodesPool.componentNodes,
                            incomingInput,
                            this.AppDataSource,
                            databaseEntities,
                            logger
                        )
                    }
                }

                /*** Get Starting Nodes with Reversed Graph ***/
                const constructedObj = constructGraphs(nodes, edges, { isReversed: true })
                const nonDirectedGraph = constructedObj.graph
                let startingNodeIds: string[] = []
                let depthQueue: IDepthQueue = {}
                for (const endingNodeId of endingNodeIds) {
                    const res = getStartingNodes(nonDirectedGraph, endingNodeId)
                    startingNodeIds.push(...res.startingNodeIds)
                    depthQueue = Object.assign(depthQueue, res.depthQueue)
                }
                startingNodeIds = [...new Set(startingNodeIds)]

                const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))

                logger.debug(`[server]: Start building chatflow ${chatflowid}`)
                /*** BFS to traverse from Starting Nodes to Ending Node ***/
                const reactFlowNodes = await buildFlow(
                    startingNodeIds,
                    nodes,
                    edges,
                    graph,
                    depthQueue,
                    this.nodesPool.componentNodes,
                    incomingInput.question,
                    chatHistory,
                    chatId,
                    sessionId ?? '',
                    chatflowid,
                    this.AppDataSource,
                    incomingInput?.overrideConfig,
                    this.cachePool,
                    false,
                    undefined,
                    incomingInput.uploads
                )

                const nodeToExecute =
                    endingNodeIds.length === 1
                        ? reactFlowNodes.find((node: IReactFlowNode) => endingNodeIds[0] === node.id)
                        : reactFlowNodes[reactFlowNodes.length - 1]
                if (!nodeToExecute) return res.status(404).send(`Node not found`)

                if (incomingInput.overrideConfig) {
                    nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
                }

                const reactFlowNodeData: INodeData = resolveVariables(
                    nodeToExecute.data,
                    reactFlowNodes,
                    incomingInput.question,
                    chatHistory
                )
                nodeToExecuteData = reactFlowNodeData

                this.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
            }

            logger.debug(`[server]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

            const nodeInstanceFilePath = this.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const nodeInstance = new nodeModule.nodeClass({ sessionId })

            let result = isStreamValid
                ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                      chatId,
                      chatflowid,
                      chatHistory: incomingInput.history,
                      logger,
                      appDataSource: this.AppDataSource,
                      databaseEntities,
                      analytic: chatflow.analytic,
                      uploads: incomingInput.uploads,
                      socketIO,
                      socketIOClientId: incomingInput.socketIOClientId
                  })
                : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                      chatId,
                      chatflowid,
                      chatHistory: incomingInput.history,
                      logger,
                      appDataSource: this.AppDataSource,
                      databaseEntities,
                      analytic: chatflow.analytic,
                      uploads: incomingInput.uploads
                  })

            result = typeof result === 'string' ? { text: result } : result

            // Retrieve threadId from assistant if exists
            if (typeof result === 'object' && result.assistant) {
                sessionId = result.assistant.threadId
            }

            const userMessage: Omit<IChatMessage, 'id'> = {
                role: 'userMessage',
                content: incomingInput.question,
                chatflowid,
                chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId,
                createdDate: userMessageDateTime,
                fileUploads: incomingInput.uploads ? JSON.stringify(fileUploads) : undefined
            }
            await this.addChatMessage(userMessage)

            let resultText = ''
            if (result.text) resultText = result.text
            else if (result.json) resultText = '```json\n' + JSON.stringify(result.json, null, 2)
            else resultText = JSON.stringify(result, null, 2)

            const apiMessage: Omit<IChatMessage, 'id' | 'createdDate'> = {
                role: 'apiMessage',
                content: resultText,
                chatflowid,
                chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId
            }
            if (result?.sourceDocuments) apiMessage.sourceDocuments = JSON.stringify(result.sourceDocuments)
            if (result?.usedTools) apiMessage.usedTools = JSON.stringify(result.usedTools)
            if (result?.fileAnnotations) apiMessage.fileAnnotations = JSON.stringify(result.fileAnnotations)
            const chatMessage = await this.addChatMessage(apiMessage)

            logger.debug(`[server]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)
            await this.telemetry.sendTelemetry('prediction_sent', {
                version: await getAppVersion(),
                chatflowId: chatflowid,
                chatId,
                type: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                flowGraph: getTelemetryFlowObj(nodes, edges)
            })

            // Prepare response
            // return the question in the response
            // this is used when input text is empty but question is in audio format
            result.question = incomingInput.question
            result.chatId = chatId
            result.chatMessageId = chatMessage.id
            if (sessionId) result.sessionId = sessionId
            if (memoryType) result.memoryType = memoryType

            return res.json(result)
        } catch (e: any) {
            logger.error('[server]: Error:', e)
            return res.status(500).send(e.message)
        }
    }

    async stopApp() {
        try {
            const removePromises: any[] = []
            removePromises.push(this.telemetry.flush())
            await Promise.all(removePromises)
        } catch (e) {
            logger.error(`❌[server]: Flowise Server shut down error: ${e}`)
        }
    }
}

let serverApp: App | undefined

export async function getAllChatFlow(): Promise<IChatFlow[]> {
    return await getDataSource().getRepository(ChatFlow).find()
}

export async function start(): Promise<void> {
    serverApp = new App()

    const port = parseInt(process.env.PORT || '', 10) || 3000
    const server = http.createServer(serverApp.app)

    const io = new Server(server, {
        cors: getCorsOptions()
    })

    await serverApp.initDatabase()
    await serverApp.config(io)

    server.listen(port, () => {
        logger.info(`⚡️ [server]: Flowise Server is listening at ${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
