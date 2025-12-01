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
        // General Settings
        FLOWISE_FILE_SIZE_LIMIT: Flags.string(),
        PORT: Flags.string(),
        CORS_ORIGINS: Flags.string(),
        IFRAME_ORIGINS: Flags.string(),
        DEBUG: Flags.string(),
        NUMBER_OF_PROXIES: Flags.string(),
        SHOW_COMMUNITY_NODES: Flags.string(),
        DISABLE_FLOWISE_TELEMETRY: Flags.string(),
        DISABLED_NODES: Flags.string(),

        // Logging
        LOG_PATH: Flags.string(),
        LOG_LEVEL: Flags.string(),
        LOG_SANITIZE_BODY_FIELDS: Flags.string(),
        LOG_SANITIZE_HEADER_FIELDS: Flags.string(),

        // Custom tool/function dependencies
        TOOL_FUNCTION_BUILTIN_DEP: Flags.string(),
        TOOL_FUNCTION_EXTERNAL_DEP: Flags.string(),
        ALLOW_BUILTIN_DEP: Flags.string(),

        // Database
        DATABASE_TYPE: Flags.string(),
        DATABASE_PATH: Flags.string(),
        DATABASE_PORT: Flags.string(),
        DATABASE_HOST: Flags.string(),
        DATABASE_NAME: Flags.string(),
        DATABASE_USER: Flags.string(),
        DATABASE_PASSWORD: Flags.string(),
        DATABASE_SSL: Flags.string(),
        DATABASE_SSL_KEY_BASE64: Flags.string(),
        DATABASE_REJECT_UNAUTHORIZED: Flags.string(),

        // Langsmith tracing
        LANGCHAIN_TRACING_V2: Flags.string(),
        LANGCHAIN_ENDPOINT: Flags.string(),
        LANGCHAIN_API_KEY: Flags.string(),
        LANGCHAIN_PROJECT: Flags.string(),

        // Model list config
        MODEL_LIST_CONFIG_JSON: Flags.string(),

        // Storage
        STORAGE_TYPE: Flags.string(),
        BLOB_STORAGE_PATH: Flags.string(),
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

        // Credentials / Secret Keys
        SECRETKEY_STORAGE_TYPE: Flags.string(),
        SECRETKEY_PATH: Flags.string(),
        FLOWISE_SECRETKEY_OVERWRITE: Flags.string(),
        SECRETKEY_AWS_ACCESS_KEY: Flags.string(),
        SECRETKEY_AWS_SECRET_KEY: Flags.string(),
        SECRETKEY_AWS_REGION: Flags.string(),
        SECRETKEY_AWS_NAME: Flags.string(),

        // Queue
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

        // Security
        CUSTOM_MCP_SECURITY_CHECK: Flags.string(),
        CUSTOM_MCP_PROTOCOL: Flags.string(),
        HTTP_DENY_LIST: Flags.string(),
        TRUST_PROXY: Flags.string(),

        // Auth
        APP_URL: Flags.string(),
        SMTP_HOST: Flags.string(),
        SMTP_PORT: Flags.string(),
        SMTP_USER: Flags.string(),
        SMTP_PASSWORD: Flags.string(),
        SMTP_SECURE: Flags.string(),
        ALLOW_UNAUTHORIZED_CERTS: Flags.string(),
        SENDER_EMAIL: Flags.string(),
        JWT_AUTH_TOKEN_SECRET: Flags.string(),
        JWT_REFRESH_TOKEN_SECRET: Flags.string(),
        JWT_ISSUER: Flags.string(),
        JWT_AUDIENCE: Flags.string(),
        JWT_TOKEN_EXPIRY_IN_MINUTES: Flags.string(),
        JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES: Flags.string(),
        EXPIRE_AUTH_TOKENS_ON_RESTART: Flags.string(),
        EXPRESS_SESSION_SECRET: Flags.string(),
        SECURE_COOKIES: Flags.string(),
        INVITE_TOKEN_EXPIRY_IN_HOURS: Flags.string(),
        PASSWORD_RESET_TOKEN_EXPIRY_IN_MINS: Flags.string(),
        PASSWORD_SALT_HASH_ROUNDS: Flags.string(),
        TOKEN_HASH_SECRET: Flags.string(),
        WORKSPACE_INVITE_TEMPLATE_PATH: Flags.string(),

        // Enterprise
        LICENSE_URL: Flags.string(),
        FLOWISE_EE_LICENSE_KEY: Flags.string(),
        OFFLINE: Flags.string(),

        // Metrics
        POSTHOG_PUBLIC_API_KEY: Flags.string(),
        ENABLE_METRICS: Flags.string(),
        METRICS_PROVIDER: Flags.string(),
        METRICS_INCLUDE_NODE_METRICS: Flags.string(),
        METRICS_SERVICE_NAME: Flags.string(),
        METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT: Flags.string(),
        METRICS_OPEN_TELEMETRY_PROTOCOL: Flags.string(),
        METRICS_OPEN_TELEMETRY_DEBUG: Flags.string(),

        // Proxy
        GLOBAL_AGENT_HTTP_PROXY: Flags.string(),
        GLOBAL_AGENT_HTTPS_PROXY: Flags.string(),
        GLOBAL_AGENT_NO_PROXY: Flags.string(),

        // Document Loaders
        PUPPETEER_EXECUTABLE_FILE_PATH: Flags.string(),
        PLAYWRIGHT_EXECUTABLE_FILE_PATH: Flags.string()
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
        if (flags.DISABLE_FLOWISE_TELEMETRY) process.env.DISABLE_FLOWISE_TELEMETRY = flags.DISABLE_FLOWISE_TELEMETRY
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
        if (flags.LOG_SANITIZE_BODY_FIELDS) process.env.LOG_SANITIZE_BODY_FIELDS = flags.LOG_SANITIZE_BODY_FIELDS
        if (flags.LOG_SANITIZE_HEADER_FIELDS) process.env.LOG_SANITIZE_HEADER_FIELDS = flags.LOG_SANITIZE_HEADER_FIELDS

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
        if (flags.DATABASE_REJECT_UNAUTHORIZED) process.env.DATABASE_REJECT_UNAUTHORIZED = flags.DATABASE_REJECT_UNAUTHORIZED

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
        if (flags.TRUST_PROXY) process.env.TRUST_PROXY = flags.TRUST_PROXY

        // Auth
        if (flags.APP_URL) process.env.APP_URL = flags.APP_URL
        if (flags.SMTP_HOST) process.env.SMTP_HOST = flags.SMTP_HOST
        if (flags.SMTP_PORT) process.env.SMTP_PORT = flags.SMTP_PORT
        if (flags.SMTP_USER) process.env.SMTP_USER = flags.SMTP_USER
        if (flags.SMTP_PASSWORD) process.env.SMTP_PASSWORD = flags.SMTP_PASSWORD
        if (flags.SMTP_SECURE) process.env.SMTP_SECURE = flags.SMTP_SECURE
        if (flags.ALLOW_UNAUTHORIZED_CERTS) process.env.ALLOW_UNAUTHORIZED_CERTS = flags.ALLOW_UNAUTHORIZED_CERTS
        if (flags.SENDER_EMAIL) process.env.SENDER_EMAIL = flags.SENDER_EMAIL
        if (flags.JWT_AUTH_TOKEN_SECRET) process.env.JWT_AUTH_TOKEN_SECRET = flags.JWT_AUTH_TOKEN_SECRET
        if (flags.JWT_REFRESH_TOKEN_SECRET) process.env.JWT_REFRESH_TOKEN_SECRET = flags.JWT_REFRESH_TOKEN_SECRET
        if (flags.JWT_ISSUER) process.env.JWT_ISSUER = flags.JWT_ISSUER
        if (flags.JWT_AUDIENCE) process.env.JWT_AUDIENCE = flags.JWT_AUDIENCE
        if (flags.JWT_TOKEN_EXPIRY_IN_MINUTES) process.env.JWT_TOKEN_EXPIRY_IN_MINUTES = flags.JWT_TOKEN_EXPIRY_IN_MINUTES
        if (flags.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES)
            process.env.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES = flags.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES
        if (flags.EXPIRE_AUTH_TOKENS_ON_RESTART) process.env.EXPIRE_AUTH_TOKENS_ON_RESTART = flags.EXPIRE_AUTH_TOKENS_ON_RESTART
        if (flags.EXPRESS_SESSION_SECRET) process.env.EXPRESS_SESSION_SECRET = flags.EXPRESS_SESSION_SECRET
        if (flags.SECURE_COOKIES) process.env.SECURE_COOKIES = flags.SECURE_COOKIES
        if (flags.INVITE_TOKEN_EXPIRY_IN_HOURS) process.env.INVITE_TOKEN_EXPIRY_IN_HOURS = flags.INVITE_TOKEN_EXPIRY_IN_HOURS
        if (flags.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINS)
            process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINS = flags.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINS
        if (flags.PASSWORD_SALT_HASH_ROUNDS) process.env.PASSWORD_SALT_HASH_ROUNDS = flags.PASSWORD_SALT_HASH_ROUNDS
        if (flags.TOKEN_HASH_SECRET) process.env.TOKEN_HASH_SECRET = flags.TOKEN_HASH_SECRET
        if (flags.WORKSPACE_INVITE_TEMPLATE_PATH) process.env.WORKSPACE_INVITE_TEMPLATE_PATH = flags.WORKSPACE_INVITE_TEMPLATE_PATH

        // Enterprise
        if (flags.LICENSE_URL) process.env.LICENSE_URL = flags.LICENSE_URL
        if (flags.FLOWISE_EE_LICENSE_KEY) process.env.FLOWISE_EE_LICENSE_KEY = flags.FLOWISE_EE_LICENSE_KEY
        if (flags.OFFLINE) process.env.OFFLINE = flags.OFFLINE

        // Metrics
        if (flags.POSTHOG_PUBLIC_API_KEY) process.env.POSTHOG_PUBLIC_API_KEY = flags.POSTHOG_PUBLIC_API_KEY
        if (flags.ENABLE_METRICS) process.env.ENABLE_METRICS = flags.ENABLE_METRICS
        if (flags.METRICS_PROVIDER) process.env.METRICS_PROVIDER = flags.METRICS_PROVIDER
        if (flags.METRICS_INCLUDE_NODE_METRICS) process.env.METRICS_INCLUDE_NODE_METRICS = flags.METRICS_INCLUDE_NODE_METRICS
        if (flags.METRICS_SERVICE_NAME) process.env.METRICS_SERVICE_NAME = flags.METRICS_SERVICE_NAME
        if (flags.METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT)
            process.env.METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT = flags.METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT
        if (flags.METRICS_OPEN_TELEMETRY_PROTOCOL) process.env.METRICS_OPEN_TELEMETRY_PROTOCOL = flags.METRICS_OPEN_TELEMETRY_PROTOCOL
        if (flags.METRICS_OPEN_TELEMETRY_DEBUG) process.env.METRICS_OPEN_TELEMETRY_DEBUG = flags.METRICS_OPEN_TELEMETRY_DEBUG

        // Proxy
        if (flags.GLOBAL_AGENT_HTTP_PROXY) process.env.GLOBAL_AGENT_HTTP_PROXY = flags.GLOBAL_AGENT_HTTP_PROXY
        if (flags.GLOBAL_AGENT_HTTPS_PROXY) process.env.GLOBAL_AGENT_HTTPS_PROXY = flags.GLOBAL_AGENT_HTTPS_PROXY
        if (flags.GLOBAL_AGENT_NO_PROXY) process.env.GLOBAL_AGENT_NO_PROXY = flags.GLOBAL_AGENT_NO_PROXY

        // Document Loaders
        if (flags.PUPPETEER_EXECUTABLE_FILE_PATH) process.env.PUPPETEER_EXECUTABLE_FILE_PATH = flags.PUPPETEER_EXECUTABLE_FILE_PATH
        if (flags.PLAYWRIGHT_EXECUTABLE_FILE_PATH) process.env.PLAYWRIGHT_EXECUTABLE_FILE_PATH = flags.PLAYWRIGHT_EXECUTABLE_FILE_PATH
    }
}
