import express from 'express'
import cors from 'cors'
import http from 'http'
import basicAuth from 'express-basic-auth'
import { Server } from 'socket.io'
import { DataSource } from 'typeorm'
import { IChatFlow } from './Interface'
import { getEncryptionKey } from './utils'
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

import authenticationHandlerMiddleware from './middlewares/authentication'
import passport from 'passport'
import passportConfig from './config/passport'
import session from 'express-session'

passportConfig(passport)
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
        try {
            await this.AppDataSource.initialize()
            logger.info('📦 [server]: Data Source is initializing...')

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
            const AllChatFlow: IChatFlow[] = await getAllChatFlow({})
            await initializeRateLimiter(AllChatFlow)

            // Initialize cache pool
            this.cachePool = new CachePool()

            // Initialize telemetry
            this.telemetry = new Telemetry()
            logger.info('📦 [server]: Data Source has been initialized!')
        } catch (error) {
            logger.error('❌ [server]: Error during Data Source initialization:', error)
        }
    }

    async config(socketIO?: Server) {
        // Limit is needed to allow sending/receiving base64 encoded string
        const flowise_file_size_limit = process.env.FLOWISE_FILE_SIZE_LIMIT || '50mb'
        this.app.use(express.json({ limit: flowise_file_size_limit }))
        this.app.use(express.urlencoded({ limit: flowise_file_size_limit, extended: true }))
        if (process.env.NUMBER_OF_PROXIES && parseInt(process.env.NUMBER_OF_PROXIES) > 0)
            this.app.set('trust proxy', parseInt(process.env.NUMBER_OF_PROXIES))

        // Allow access from specified domains
        this.app.use(cors(getCorsOptions()))

        // Passport Middleware
        this.app.use(
            session({
                secret: process.env.SESSION_SECRET ?? 'theanswerai',
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: process.env.NODE_ENV === 'production'
                }
            })
        )
        this.app.use(passport.initialize())
        this.app.use(passport.session())

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
        const whitelistURLs = [
            '/api/v1/google-auth',
            process.env.GOOGLE_CALLBACK_URL ?? '/api/v1/google-auth/callback',
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
            '/api/v1/openai-assistants-file/download',
            '/api/v1/feedback',
            '/api/v1/leads',
            '/api/v1/get-upload-file',
            '/api/v1/ip',
            '/api/v1/ping',
            '/api/v1/marketplaces/templates',
            '/api/v1/billing/usage/sync'
        ]
        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            const username = process.env.FLOWISE_USERNAME
            const password = process.env.FLOWISE_PASSWORD
            const basicAuthMiddleware = basicAuth({
                users: { [username]: password }
            })
            this.app.use((req, res, next) => {
                if (/\/api\/v1\//i.test(req.url)) {
                    whitelistURLs.some((url) => new RegExp(url, 'i').test(req.url)) ? next() : basicAuthMiddleware(req, res, next)
                } else next()
            })
        }

        this.app.use(authenticationHandlerMiddleware({ whitelistURLs, AppDataSource: this.AppDataSource }))

        this.app.use('/api/v1', flowiseApiV1Router)

        // ----------------------------------------
        // Configure number of proxies in Host Environment
        // ----------------------------------------
        this.app.get('/api/v1/ip', (request, response) => {
            response.send({
                ip: request.ip,
                msg: 'Check returned IP address in the response. If it matches your current IP address ( which you can get by going to http://ip.nfriedly.com/ or https://api.ipify.org/ ), then the number of proxies is correct and the rate limiter should now work correctly. If not, increase the number of proxies by 1 and restart Cloud-Hosted Flowise until the IP address matches your own. Visit https://docs.flowiseai.com/configuration/rate-limit#cloud-hosted-rate-limit-setup-guide for more information.'
            })
        })

        // ----------------------------------------
        // Redirect to staging.theanswer.ai
        // ----------------------------------------

        // this.app.use((req: express.Request, res: express.Response) => {
        //     const path = req.url
        //     const encodedDomain = Buffer.from(process.env.DOMAIN || '').toString('base64')
        //     const redirectURL = new URL(`${encodedDomain}${path}`, process.env.ANSWERAI_DOMAIN)
        //     console.log('Redirecting to', redirectURL.toString())
        //     res.redirect(301, redirectURL.toString())
        // })

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

export const getAllChatFlow = async ({ userId }: { userId?: string }): Promise<IChatFlow[]> =>
    getDataSource()
        .getRepository(ChatFlow)
        .createQueryBuilder('chatFlow')
        .where(userId ? 'chatFlow.userId = :userId OR chatFlow.userId IS NULL' : 'chatFlow.userId IS NULL', { userId })
        .getMany()

export async function start(): Promise<void> {
    serverApp = new App()

    const host = process.env.HOST
    const port = parseInt(process.env.PORT || '', 10) || 3000
    const server = http.createServer(serverApp.app)

    const io = new Server(server, {
        cors: getCorsOptions()
    })

    await serverApp.initDatabase()
    await serverApp.config(io)

    server.listen(port, host, () => {
        logger.info(`⚡️ [server]: Flowise Server is listening at ${host ? 'http://' + host : ''}:${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
