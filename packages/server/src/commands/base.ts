import { Command, Flags } from '@oclif/core'
import dotenv from 'dotenv'
import path from 'path'
import logger from '../utils/logger'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true })

enum EXIT_CODE {
    SUCCESS = 0,
    FAILED = 1
}

export abstract class BaseCommand extends Command {
    static flags = {
        FLOWISE_FILE_SIZE_LIMIT: Flags.string(),
        PORT: Flags.string(),
        CORS_ORIGINS: Flags.string(),
        IFRAME_ORIGINS: Flags.string(),
        DEBUG: Flags.string(),
        BLOB_STORAGE_PATH: Flags.string(),
        LOG_PATH: Flags.string(),
        LOG_LEVEL: Flags.string(),
        TOOL_FUNCTION_BUILTIN_DEP: Flags.string(),
        TOOL_FUNCTION_EXTERNAL_DEP: Flags.string(),
        ALLOW_BUILTIN_DEP: Flags.string(),
        NUMBER_OF_PROXIES: Flags.string(),
        DATABASE_TYPE: Flags.string(),
        DATABASE_PATH: Flags.string(),
        DATABASE_PORT: Flags.string(),
        DATABASE_HOST: Flags.string(),
        DATABASE_NAME: Flags.string(),
        DATABASE_USER: Flags.string(),
        DATABASE_PASSWORD: Flags.string(),
        DATABASE_SSL: Flags.string(),
        DATABASE_SSL_KEY_BASE64: Flags.string(),
        LANGCHAIN_TRACING_V2: Flags.string(),
        LANGCHAIN_ENDPOINT: Flags.string(),
        LANGCHAIN_API_KEY: Flags.string(),
        LANGCHAIN_PROJECT: Flags.string(),
        MODEL_LIST_CONFIG_JSON: Flags.string(),
        STORAGE_TYPE: Flags.string(),
        S3_STORAGE_BUCKET_NAME: Flags.string(),
        S3_STORAGE_ACCESS_KEY_ID: Flags.string(),
        S3_STORAGE_SECRET_ACCESS_KEY: Flags.string(),
        S3_STORAGE_REGION: Flags.string(),
        S3_ENDPOINT_URL: Flags.string(),
        S3_FORCE_PATH_STYLE: Flags.string(),
        GOOGLE_CLOUD_STORAGE_CREDENTIAL: Flags.string(),
        GOOGLE_CLOUD_STORAGE_PROJ_ID: Flags.string(),
        GOOGLE_CLOUD_STORAGE_BUCKET_NAME: Flags.string(),
        GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS: Flags.string(),
        SHOW_COMMUNITY_NODES: Flags.string(),
        SECRETKEY_STORAGE_TYPE: Flags.string(),
        SECRETKEY_PATH: Flags.string(),
        FLOWISE_SECRETKEY_OVERWRITE: Flags.string(),
        SECRETKEY_AWS_ACCESS_KEY: Flags.string(),
        SECRETKEY_AWS_SECRET_KEY: Flags.string(),
        SECRETKEY_AWS_REGION: Flags.string(),
        SECRETKEY_AWS_NAME: Flags.string(),
        DISABLED_NODES: Flags.string(),
        MODE: Flags.string(),
        WORKER_CONCURRENCY: Flags.string(),
        QUEUE_NAME: Flags.string(),
        QUEUE_REDIS_EVENT_STREAM_MAX_LEN: Flags.string(),
        REMOVE_ON_AGE: Flags.string(),
        REMOVE_ON_COUNT: Flags.string(),
        REDIS_URL: Flags.string(),
        REDIS_HOST: Flags.string(),
        REDIS_PORT: Flags.string(),
        REDIS_USERNAME: Flags.string(),
        REDIS_PASSWORD: Flags.string(),
        REDIS_TLS: Flags.string(),
        REDIS_CERT: Flags.string(),
        REDIS_KEY: Flags.string(),
        REDIS_CA: Flags.string(),
        REDIS_KEEP_ALIVE: Flags.string(),
        ENABLE_BULLMQ_DASHBOARD: Flags.string(),
        CUSTOM_MCP_SECURITY_CHECK: Flags.string(),
        CUSTOM_MCP_PROTOCOL: Flags.string(),
        HTTP_DENY_LIST: Flags.string()
    }

    protected async stopProcess() {
        // Overridden method by child class
    }

    protected onTerminate() {
        return async () => {
            try {
                // Shut down the app after timeout if it ever stuck removing pools
                setTimeout(async () => {
                    logger.info('Flowise was forced to shut down after 30 secs')
                    await this.failExit()
                }, 30000)

                await this.stopProcess()
            } catch (error) {
                logger.error('There was an error shutting down Flowise...', error)
            }
        }
    }

    protected async gracefullyExit() {
        process.exit(EXIT_CODE.SUCCESS)
    }

    protected async failExit() {
        process.exit(EXIT_CODE.FAILED)
    }

    async init(): Promise<void> {
        await super.init()

        process.on('SIGTERM', this.onTerminate())
        process.on('SIGINT', this.onTerminate())

        // Prevent throw new Error from crashing the app
        // TODO: Get rid of this and send proper error message to ui
        process.on('uncaughtException', (err) => {
            logger.error('uncaughtException: ', err)
        })

        process.on('unhandledRejection', (err) => {
            logger.error('unhandledRejection: ', err)
        })

        const { flags } = await this.parse(this.constructor as any)
        if (flags.PORT) process.env.PORT = flags.PORT
        if (flags.CORS_ORIGINS) process.env.CORS_ORIGINS = flags.CORS_ORIGINS
        if (flags.IFRAME_ORIGINS) process.env.IFRAME_ORIGINS = flags.IFRAME_ORIGINS
        if (flags.DEBUG) process.env.DEBUG = flags.DEBUG
        if (flags.NUMBER_OF_PROXIES) process.env.NUMBER_OF_PROXIES = flags.NUMBER_OF_PROXIES
        if (flags.SHOW_COMMUNITY_NODES) process.env.SHOW_COMMUNITY_NODES = flags.SHOW_COMMUNITY_NODES
        if (flags.DISABLED_NODES) process.env.DISABLED_NODES = flags.DISABLED_NODES
        if (flags.FLOWISE_FILE_SIZE_LIMIT) process.env.FLOWISE_FILE_SIZE_LIMIT = flags.FLOWISE_FILE_SIZE_LIMIT

        // Credentials
        if (flags.SECRETKEY_STORAGE_TYPE) process.env.SECRETKEY_STORAGE_TYPE = flags.SECRETKEY_STORAGE_TYPE
        if (flags.SECRETKEY_PATH) process.env.SECRETKEY_PATH = flags.SECRETKEY_PATH
        if (flags.FLOWISE_SECRETKEY_OVERWRITE) process.env.FLOWISE_SECRETKEY_OVERWRITE = flags.FLOWISE_SECRETKEY_OVERWRITE
        if (flags.SECRETKEY_AWS_ACCESS_KEY) process.env.SECRETKEY_AWS_ACCESS_KEY = flags.SECRETKEY_AWS_ACCESS_KEY
        if (flags.SECRETKEY_AWS_SECRET_KEY) process.env.SECRETKEY_AWS_SECRET_KEY = flags.SECRETKEY_AWS_SECRET_KEY
        if (flags.SECRETKEY_AWS_REGION) process.env.SECRETKEY_AWS_REGION = flags.SECRETKEY_AWS_REGION
        if (flags.SECRETKEY_AWS_NAME) process.env.SECRETKEY_AWS_NAME = flags.SECRETKEY_AWS_NAME

        // Logs
        if (flags.LOG_PATH) process.env.LOG_PATH = flags.LOG_PATH
        if (flags.LOG_LEVEL) process.env.LOG_LEVEL = flags.LOG_LEVEL

        // Custom tool/function dependencies
        if (flags.TOOL_FUNCTION_BUILTIN_DEP) process.env.TOOL_FUNCTION_BUILTIN_DEP = flags.TOOL_FUNCTION_BUILTIN_DEP
        if (flags.TOOL_FUNCTION_EXTERNAL_DEP) process.env.TOOL_FUNCTION_EXTERNAL_DEP = flags.TOOL_FUNCTION_EXTERNAL_DEP
        if (flags.ALLOW_BUILTIN_DEP) process.env.ALLOW_BUILTIN_DEP = flags.ALLOW_BUILTIN_DEP

        // Database config
        if (flags.DATABASE_TYPE) process.env.DATABASE_TYPE = flags.DATABASE_TYPE
        if (flags.DATABASE_PATH) process.env.DATABASE_PATH = flags.DATABASE_PATH
        if (flags.DATABASE_PORT) process.env.DATABASE_PORT = flags.DATABASE_PORT
        if (flags.DATABASE_HOST) process.env.DATABASE_HOST = flags.DATABASE_HOST
        if (flags.DATABASE_NAME) process.env.DATABASE_NAME = flags.DATABASE_NAME
        if (flags.DATABASE_USER) process.env.DATABASE_USER = flags.DATABASE_USER
        if (flags.DATABASE_PASSWORD) process.env.DATABASE_PASSWORD = flags.DATABASE_PASSWORD
        if (flags.DATABASE_SSL) process.env.DATABASE_SSL = flags.DATABASE_SSL
        if (flags.DATABASE_SSL_KEY_BASE64) process.env.DATABASE_SSL_KEY_BASE64 = flags.DATABASE_SSL_KEY_BASE64

        // Langsmith tracing
        if (flags.LANGCHAIN_TRACING_V2) process.env.LANGCHAIN_TRACING_V2 = flags.LANGCHAIN_TRACING_V2
        if (flags.LANGCHAIN_ENDPOINT) process.env.LANGCHAIN_ENDPOINT = flags.LANGCHAIN_ENDPOINT
        if (flags.LANGCHAIN_API_KEY) process.env.LANGCHAIN_API_KEY = flags.LANGCHAIN_API_KEY
        if (flags.LANGCHAIN_PROJECT) process.env.LANGCHAIN_PROJECT = flags.LANGCHAIN_PROJECT

        // Model list config
        if (flags.MODEL_LIST_CONFIG_JSON) process.env.MODEL_LIST_CONFIG_JSON = flags.MODEL_LIST_CONFIG_JSON

        // Storage
        if (flags.STORAGE_TYPE) process.env.STORAGE_TYPE = flags.STORAGE_TYPE
        if (flags.BLOB_STORAGE_PATH) process.env.BLOB_STORAGE_PATH = flags.BLOB_STORAGE_PATH
        if (flags.S3_STORAGE_BUCKET_NAME) process.env.S3_STORAGE_BUCKET_NAME = flags.S3_STORAGE_BUCKET_NAME
        if (flags.S3_STORAGE_ACCESS_KEY_ID) process.env.S3_STORAGE_ACCESS_KEY_ID = flags.S3_STORAGE_ACCESS_KEY_ID
        if (flags.S3_STORAGE_SECRET_ACCESS_KEY) process.env.S3_STORAGE_SECRET_ACCESS_KEY = flags.S3_STORAGE_SECRET_ACCESS_KEY
        if (flags.S3_STORAGE_REGION) process.env.S3_STORAGE_REGION = flags.S3_STORAGE_REGION
        if (flags.S3_ENDPOINT_URL) process.env.S3_ENDPOINT_URL = flags.S3_ENDPOINT_URL
        if (flags.S3_FORCE_PATH_STYLE) process.env.S3_FORCE_PATH_STYLE = flags.S3_FORCE_PATH_STYLE
        if (flags.GOOGLE_CLOUD_STORAGE_CREDENTIAL) process.env.GOOGLE_CLOUD_STORAGE_CREDENTIAL = flags.GOOGLE_CLOUD_STORAGE_CREDENTIAL
        if (flags.GOOGLE_CLOUD_STORAGE_PROJ_ID) process.env.GOOGLE_CLOUD_STORAGE_PROJ_ID = flags.GOOGLE_CLOUD_STORAGE_PROJ_ID
        if (flags.GOOGLE_CLOUD_STORAGE_BUCKET_NAME) process.env.GOOGLE_CLOUD_STORAGE_BUCKET_NAME = flags.GOOGLE_CLOUD_STORAGE_BUCKET_NAME
        if (flags.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS)
            process.env.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS = flags.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS

        // Queue
        if (flags.MODE) process.env.MODE = flags.MODE
        if (flags.REDIS_URL) process.env.REDIS_URL = flags.REDIS_URL
        if (flags.REDIS_HOST) process.env.REDIS_HOST = flags.REDIS_HOST
        if (flags.REDIS_PORT) process.env.REDIS_PORT = flags.REDIS_PORT
        if (flags.REDIS_USERNAME) process.env.REDIS_USERNAME = flags.REDIS_USERNAME
        if (flags.REDIS_PASSWORD) process.env.REDIS_PASSWORD = flags.REDIS_PASSWORD
        if (flags.REDIS_TLS) process.env.REDIS_TLS = flags.REDIS_TLS
        if (flags.REDIS_CERT) process.env.REDIS_CERT = flags.REDIS_CERT
        if (flags.REDIS_KEY) process.env.REDIS_KEY = flags.REDIS_KEY
        if (flags.REDIS_CA) process.env.REDIS_CA = flags.REDIS_CA
        if (flags.WORKER_CONCURRENCY) process.env.WORKER_CONCURRENCY = flags.WORKER_CONCURRENCY
        if (flags.QUEUE_NAME) process.env.QUEUE_NAME = flags.QUEUE_NAME
        if (flags.QUEUE_REDIS_EVENT_STREAM_MAX_LEN) process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN = flags.QUEUE_REDIS_EVENT_STREAM_MAX_LEN
        if (flags.REMOVE_ON_AGE) process.env.REMOVE_ON_AGE = flags.REMOVE_ON_AGE
        if (flags.REMOVE_ON_COUNT) process.env.REMOVE_ON_COUNT = flags.REMOVE_ON_COUNT
        if (flags.REDIS_KEEP_ALIVE) process.env.REDIS_KEEP_ALIVE = flags.REDIS_KEEP_ALIVE
        if (flags.ENABLE_BULLMQ_DASHBOARD) process.env.ENABLE_BULLMQ_DASHBOARD = flags.ENABLE_BULLMQ_DASHBOARD

        // Security
        if (flags.CUSTOM_MCP_SECURITY_CHECK) process.env.CUSTOM_MCP_SECURITY_CHECK = flags.CUSTOM_MCP_SECURITY_CHECK
        if (flags.CUSTOM_MCP_PROTOCOL) process.env.CUSTOM_MCP_PROTOCOL = flags.CUSTOM_MCP_PROTOCOL
        if (flags.HTTP_DENY_LIST) process.env.HTTP_DENY_LIST = flags.HTTP_DENY_LIST
    }
}
