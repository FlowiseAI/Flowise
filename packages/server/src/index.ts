import express from 'express'
import { Request, Response } from 'express'
import path from 'path'
import cors from 'cors'
import http from 'http'
import basicAuth from 'express-basic-auth'
import { Server } from 'socket.io'
import { DataSource } from 'typeorm'
import { IChatFlow } from './Interface'
import { getNodeModulesPackagePath, getEncryptionKey } from './utils'
import logger, { expressRequestLogger } from './utils/logger'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { ChatFlow } from './database/entities/ChatFlow'
import { ChatflowPool } from './ChatflowPool'
import { CachePool } from './CachePool'
import { initializeRateLimiter } from './utils/rateLimit'
import { getAPIKeys } from './utils/apiKey'
import { sanitizeMiddleware, getCorsOptions, getAllowedIframeOrigins } from './utils/XSS'
import { Telemetry } from './utils/telemetry'
import flowiseApiV1Router from './routes'
import errorHandlerMiddleware from './middlewares/errors'

declare global {
    namespace Express {
        interface Request {
            io?: Server
        }
    }
}
import { DocumentStore } from './database/entities/DocumentStore'
import { DocumentStoreDTO } from './dto/DocumentStoreDTO'
import { DocumentStoreFileChunk } from './database/entities/DocumentStoreFileChunk'

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

        // Make io accessible to our router on req.io
        this.app.use((req, res, next) => {
            req.io = socketIO
            next()
        })

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

        this.app.use('/api/v1', flowiseApiV1Router)

        // ----------------------------------------
        // Document Store
        // ----------------------------------------

        // Create new document store
        this.app.post('/api/v1/documentStores', async (req: Request, res: Response) => {
            try {
                const body = req.body
                const subFolder = convertToValidFilename(body.name)
                const dir = path.join(getStoragePath(), 'datasource', subFolder)
                if (fs.existsSync(dir)) {
                    return res.status(500).send(new Error(`Document store ${body.name} already exists. Subfolder: ${subFolder}`))
                }
                const docStore = DocumentStoreDTO.toEntity(body)
                const dStore = this.AppDataSource.getRepository(DocumentStore).create(docStore)
                const results = await this.AppDataSource.getRepository(DocumentStore).save(dStore)
                fs.mkdirSync(dir, { recursive: true })
                return res.json(results)
            } catch (e) {
                return res.status(500).send(e)
            }
        })

        // Get all document stores
        this.app.get('/api/v1/documentStores', async (req: Request, res: Response) => {
            const entities = await getDataSource().getRepository(DocumentStore).find()
            if (entities.length) {
                return res.json(DocumentStoreDTO.fromEntities(entities))
            }
            return res.json([])
        })

        // delete file from document store
        this.app.delete('/api/v1/documentStores/:id/:fileId', async (req: Request, res: Response) => {
            try {
                const storeId = req.params.id
                const fileId = req.params.fileId

                if (!storeId || !fileId) {
                    return res.status(500).send(new Error(`Document store file delete missing key information.`))
                }
                const entity = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                    id: storeId
                })
                if (!entity) return res.status(404).send(`Document store ${storeId} not found`)
                const dir = path.join(getStoragePath(), 'datasource', entity.subFolder)
                if (!fs.existsSync(dir)) {
                    return res.status(500).send(new Error(`Missing folder to delete files for Document Store ${entity.name}`))
                }
                const existingFiles = JSON.parse(entity.files)
                const found = existingFiles.find((uFile: any) => uFile.id === fileId)
                const metrics = JSON.parse(entity.metrics)
                if (found) {
                    //remove the existing file
                    fs.unlinkSync(found.path)
                    const index = existingFiles.indexOf(found)
                    if (index > -1) {
                        existingFiles.splice(index, 1)
                    }
                    metrics.totalFiles--
                    metrics.totalChunks -= found.totalChunks
                    metrics.totalChars -= found.totalChars
                    entity.status = DocumentStoreStatus.SYNC

                    await this.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: found.id })

                    entity.files = JSON.stringify(existingFiles)
                    entity.metrics = JSON.stringify(metrics)
                    await this.AppDataSource.getRepository(DocumentStore).save(entity)
                    res.json('OK')
                } else {
                    return res.status(500).send(new Error(`Unable to locate file in Document Store ${entity.name}`))
                }
            } catch (e) {
                return res.status(500).send(e)
            }
        })

        // upload file to document store
        this.app.post('/api/v1/documentStores/files', async (req: Request, res: Response) => {
            const body = req.body
            if (!body.storeId || !body.uploadFiles) {
                return res.status(500).send(new Error(`Document store upload missing key information.`))
            }
            const entity = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                id: body.storeId
            })
            if (!entity) return res.status(404).send(`Document store ${body.storeId} not found`)

            // Base64 strings
            let files: string[] = []
            const fileBase64 = body.uploadFiles
            if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                files = JSON.parse(fileBase64)
            } else {
                files = [fileBase64]
            }

            const dir = path.join(getStoragePath(), 'datasource', entity.subFolder)
            if (!fs.existsSync(dir)) {
                return res.status(500).send(new Error(`Missing folder to upload files for Document Store ${entity.name}`))
            }
            const uploadedFiles: any[] = []
            for (const file of files) {
                const splitDataURI = file.split(',')
                const filename = splitDataURI.pop()?.split(':')[1] ?? ''
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const filePath = path.join(dir, filename)
                fs.writeFileSync(filePath, bf)
                const stats = fs.statSync(filePath)
                uploadedFiles.push({
                    id: uuidv4(),
                    path: filePath,
                    name: filename,
                    size: stats.size,
                    status: DocumentStoreStatus.NEW,
                    uploaded: stats.birthtime,
                    totalChunks: 0,
                    totalChars: 0
                })
            }
            const existingFiles = JSON.parse(entity.files)
            existingFiles.map((file: any) => {
                //check if they have uploaded a file with the same as an existing file
                const found = uploadedFiles.find((uFile) => uFile.name === file.name)
                if (found) {
                    //remove the existing file
                    const index = existingFiles.indexOf(file)
                    if (index > -1) {
                        existingFiles.splice(index, 1)
                    }
                }
            })
            existingFiles.push(...uploadedFiles)
            entity.status = DocumentStoreStatus.STALE
            entity.files = JSON.stringify(existingFiles)
            await this.AppDataSource.getRepository(DocumentStore).save(entity)
            //start processing the files in the background
            const documentProcessor = new DocumentStoreProcessor()
            let config = JSON.parse(entity.config)
            documentProcessor.splitIntoChunks(entity.id, config, uploadedFiles).then(async (result: any) => {
                if (result.uploadedFiles && result.uploadedFiles.length) {
                    const entity = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                        id: result.id
                    })
                    if (!entity) return res.status(404).send(`Document store ${body.storeId} not found`)
                    entity.status = DocumentStoreStatus.SYNC
                    const files = JSON.parse(entity.files)
                    const metrics = JSON.parse(entity.metrics)
                    const filesWithChunks = files.map((file: any) => {
                        const found = result.uploadedFiles.find((uFile: any) => uFile.id === file.id)
                        let totalNewChars = 0
                        if (found) {
                            file.totalChunks = found.totalChunks
                            file.status = 'SYNC'
                            if (found.chunks) {
                                found.chunks.map(async (chunk: any) => {
                                    const docChunk: DocumentStoreFileChunk = {
                                        docId: file.id,
                                        storeId: result.id,
                                        id: uuidv4(),
                                        pageContent: chunk.pageContent,
                                        metadata: JSON.stringify(chunk.metadata)
                                    }
                                    totalNewChars += chunk.pageContent.length
                                    const dChunk = this.AppDataSource.getRepository(DocumentStoreFileChunk).create(docChunk)
                                    await this.AppDataSource.getRepository(DocumentStoreFileChunk).save(dChunk)
                                })
                                file.totalChars = totalNewChars
                            }
                            metrics.totalChunks += file.totalChunks
                            metrics.totalChars += totalNewChars
                            metrics.totalFiles++
                        }
                        return file
                    })
                    entity.metrics = JSON.stringify(metrics)
                    entity.files = JSON.stringify(filesWithChunks)
                    await this.AppDataSource.getRepository(DocumentStore).save(entity)
                }
            })
            return res.json('OK')
        })

        // Get specific store
        this.app.get('/api/v1/documentStores/:id', async (req: Request, res: Response) => {
            const entity = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                id: req.params.id
            })
            if (!entity) return res.status(404).send(`Document store ${req.params.id} not found`)

            let dto = DocumentStoreDTO.fromEntity(entity)
            return res.json(dto)
        })

        // Get chunks for a specific file
        this.app.get('/api/v1/documentStores/file/:storeId/:fileId', async (req: Request, res: Response) => {
            const entity = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                id: req.params.storeId
            })
            if (!entity) return res.status(404).send(`Document store ${req.params.storeId} not found`)
            const files = JSON.parse(entity.files)
            const found = files.find((file: any) => file.id === req.params.fileId)
            if (!found) return res.status(404).send(`Document store file ${req.params.fileId} not found`)

            const chunksWithCount = await this.AppDataSource.getRepository(DocumentStoreFileChunk).findAndCount({
                where: { docId: req.params.fileId }
            })

            if (!chunksWithCount) return res.status(404).send(`File ${req.params.fileId} not found`)
            found.storeName = entity.name
            return res.json({
                chunks: chunksWithCount[0],
                count: chunksWithCount[1],
                file: found
            })
        })

        // Update documentStore
        this.app.put('/api/v1/documentStores/:id', async (req: Request, res: Response) => {
            const docStore = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                id: req.params.id
            })

            if (!docStore) return res.status(404).send(`Document Store ${req.params.id} not found`)

            const body = req.body
            const updateDocStore = DocumentStoreDTO.toEntity(body)
            const currentConfig = JSON.parse(docStore.config)
            const files = JSON.parse(docStore.files)
            let refreshChunks = false
            if (files && files.length) {
                if (
                  currentConfig.splitter !== body.splitter ||
                  currentConfig.codeLanguage !== body.codeLanguage ||
                  currentConfig.chunkSize !== body.chunkSize ||
                  currentConfig.chunkOverlap !== body.chunkOverlap
                ) {
                    refreshChunks = true
                }
            }

            Object.assign(updateDocStore, body)

            if (refreshChunks) {
                updateDocStore.status = DocumentStoreStatus.STALE
                const documentProcessor = new DocumentStoreProcessor()
                files.map((file: any) => {
                    file.status = DocumentStoreStatus.NEW
                })
                updateDocStore.files = JSON.stringify(files)
                await this.AppDataSource.getRepository(DocumentStoreFileChunk).delete({
                    storeId: docStore.id
                })
                updateDocStore.metrics = JSON.stringify({})
                documentProcessor.splitIntoChunks(docStore.id, body, files).then(async (result: any) => {
                    if (result.uploadedFiles && result.uploadedFiles.length) {
                        const entity = await this.AppDataSource.getRepository(DocumentStore).findOneBy({
                            id: result.id
                        })
                        if (!entity) return res.status(404).send(`Document store ${req.params.id} not found`)
                        entity.status = DocumentStoreStatus.SYNC
                        const files = JSON.parse(entity.files)
                        const metrics = JSON.parse(entity.metrics)
                        const filesWithChunks = files.map((file: any) => {
                            const found = result.uploadedFiles.find((uFile: any) => uFile.id === file.id)
                            let totalNewChars = 0
                            if (found) {
                                file.totalChunks = found.totalChunks
                                file.status = 'SYNC'
                                if (found.chunks) {
                                    found.chunks.map(async (chunk: any) => {
                                        const docChunk: DocumentStoreFileChunk = {
                                            docId: file.id,
                                            storeId: result.id,
                                            id: uuidv4(),
                                            pageContent: chunk.pageContent,
                                            metadata: JSON.stringify(chunk.metadata)
                                        }
                                        totalNewChars += chunk.pageContent.length
                                        const dChunk = this.AppDataSource.getRepository(DocumentStoreFileChunk).create(docChunk)
                                        await this.AppDataSource.getRepository(DocumentStoreFileChunk).save(dChunk)
                                    })
                                    file.totalChars = totalNewChars
                                }
                                metrics.totalChunks += file.totalChunks
                                metrics.totalChars += totalNewChars
                                metrics.totalFiles++
                            }
                            return file
                        })
                        entity.metrics = JSON.stringify(metrics)
                        entity.files = JSON.stringify(filesWithChunks)
                        await this.AppDataSource.getRepository(DocumentStore).save(entity)
                    }
                })
            }
            this.AppDataSource.getRepository(DocumentStore).merge(docStore, updateDocStore)
            const result = await this.AppDataSource.getRepository(DocumentStore).save(docStore)

            return res.json(result)
        })
        // ----------------------------------------
        // Serve UI static
        // ----------------------------------------

        const packagePath = getNodeModulesPackagePath('flowise-ui')
        const uiBuildPath = path.join(packagePath, 'build')
        const uiHtmlPath = path.join(packagePath, 'build', 'index.html')

        this.app.use('/', express.static(uiBuildPath))

        // All other requests not handled will return React app
        this.app.use((req: Request, res: Response) => {
            res.sendFile(uiHtmlPath)
        })

        // Error handling
        this.app.use(errorHandlerMiddleware)
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
