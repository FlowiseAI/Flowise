/* eslint-disable */
/**
 * Seed all default credentials from AAI_DEFAULT environment variables
 * This script automatically detects all AAI_DEFAULT_* variables and creates credentials for them
 *
 * ⚠️  REQUIRED PREREQUISITES:
 * ============================
 * This script REQUIRES these environment variables or it will fail:
 *
 * MANDATORY - SCRIPT WILL EXIT WITHOUT THESE:
 * • USER_ID="your-user-uuid"        - UUID of the user who will own these credentials
 * • ORG_ID="your-organization-uuid" - UUID of the organization these credentials belong to
 *
 * CREDENTIAL API KEYS (set any you want to seed):
 * • AAI_DEFAULT_OPENAI_API_KEY      - OpenAI API key
 * • AAI_DEFAULT_ANTHROPHIC          - Anthropic API key
 * • AAI_DEFAULT_GROQ                - Groq API key
 * • AAI_DEFAULT_REPLICATE           - Replicate API key
 * • And many more... (see ENV_TO_CREDENTIAL_MAP below)
 *
 * EXAMPLE USAGE:
 *
 * 🧪 TEST MODE (default, safe, dry-run):
 * export DATABASE_SEED_USER_ID="123e4567-e89b-12d3-a456-426614174000"
 * export DATABASE_SEED_ORG_ID="987fcdeb-51d2-43a1-b123-456789abcdef"
 * export AAI_DEFAULT_OPENAI_API_KEY="sk-your-openai-key-here"
 * pnpm seed-credentials
 * # OR: node scripts/seed-credentials/seed-credentials.js --test
 * # OR: node scripts/seed-credentials/seed-credentials.js --dry-run
 * # OR: TEST_MODE=true node scripts/seed-credentials/seed-credentials.js
 *
 * 🚀 PRODUCTION MODE (actually creates/updates credentials):
 * export USER_ID="123e4567-e89b-12d3-a456-426614174000"
 * export ORG_ID="987fcdeb-51d2-43a1-b123-456789abcdef"
 * export AAI_DEFAULT_OPENAI_API_KEY="sk-your-openai-key-here"
 * pnpm seed-credentials:write
 * # OR: node scripts/seed-credentials/seed-credentials.js
 *
 * ⚠️  By default, running 'pnpm seed-credentials' is SAFE and will NOT write to the database.
 *     You must use 'pnpm seed-credentials:write' to actually write credentials.
 */
const path = require('node:path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { DataSource } = require('typeorm')
const fs = require('node:fs')
const _crypto = require('node:crypto')
const readline = require('node:readline')

// Map of environment variable prefixes to credential configurations
const ENV_TO_CREDENTIAL_MAP = {
    // Direct mappings for single API key credentials
    AAI_DEFAULT_OPENAI_API_KEY: {
        name: 'OpenAI - AAI - Default',
        credentialName: 'openAIApi',
        mapFn: (value) => ({ openAIApiKey: value })
    },
    AAI_DEFAULT_ANTHROPHIC: {
        name: 'Anthropic - AAI - Default',
        credentialName: 'anthropicApi',
        mapFn: (value) => ({ anthropicApiKey: value })
    },
    AAI_DEFAULT_GROQ: {
        name: 'Groq - AAI - Default',
        credentialName: 'groqApi',
        mapFn: (value) => ({ groqApiKey: value })
    },
    AAI_DEFAULT_DEEPSEEK: {
        name: 'Deepseek - AAI - Default',
        credentialName: 'deepseekApi',
        mapFn: (value) => ({ deepseekApiKey: value })
    },
    AAI_DEFAULT_EXASEARCH: {
        name: 'ExaSearchAI - AAI - Default',
        credentialName: 'exaSearchApi',
        mapFn: (value) => ({ exaSearchApiKey: value })
    },
    AAI_DEFAULT_REPLICATE: {
        name: 'Replicate - AAI - Default',
        credentialName: 'replicateApi',
        mapFn: (value) => ({ replicateApiKey: value })
    },
    AAI_DEFAULT_SERPAPI: {
        name: 'SerpAPI - AAI - Default',
        credentialName: 'serpApi',
        mapFn: (value) => ({ serpApiKey: value })
    },
    AAI_DEFAULT_PINECONE: {
        name: 'Pinecone - AAI - Default',
        credentialName: 'pineconeApi',
        mapFn: (value) => ({ pineconeApiKey: value })
    },
    AAI_DEFAULT_GITHUB_TOKEN: {
        name: 'GitHub - AAI - Default',
        credentialName: 'githubApi',
        mapFn: (value) => ({ accessToken: value })
    },
    AAI_DEFAULT_GITHUB_API_KEY: {
        name: 'GitHub - AAI - Default',
        credentialName: 'githubApi',
        mapFn: (value) => ({ accessToken: value })
    },
    AAI_DEFAULT_BRAVE_SEARCH: {
        name: 'Brave Search - AAI - Default',
        credentialName: 'braveSearchApi',
        mapFn: (value) => ({ braveApiKey: value })
    },

    // Additional single field mappings based on credential files
    AAI_DEFAULT_AIRTABLE_API_KEY: {
        name: 'Airtable - AAI - Default',
        credentialName: 'airtableApi',
        mapFn: (value) => ({ accessToken: value })
    },
    AAI_DEFAULT_NOTION_API_KEY: {
        name: 'Notion - AAI - Default',
        credentialName: 'notionApi',
        mapFn: (value) => ({ notionIntegrationToken: value })
    },
    AAI_DEFAULT_SLACK_API_KEY: {
        name: 'Slack - AAI - Default',
        credentialName: 'slackApi',
        mapFn: (value) => ({ botToken: value })
    },
    AAI_DEFAULT_FIGMA_API_KEY: {
        name: 'Figma - AAI - Default',
        credentialName: 'figmaApi',
        mapFn: (value) => ({ accessToken: value })
    },
    AAI_DEFAULT_GOOGLE_GENERATIVE_AI_API_KEY: {
        name: 'Google Generative AI - AAI - Default',
        credentialName: 'googleGenerativeAI',
        mapFn: (value) => ({ googleGenerativeAPIKey: value })
    },
    AAI_DEFAULT_GOOGLE_OAUTH_API_KEY: {
        name: 'Google OAuth - AAI - Default',
        credentialName: 'googleGenerativeAI',
        mapFn: (value) => ({ googleGenerativeAPIKey: value })
    },
    AAI_DEFAULT_GOOGLE_VERTEX_AI_API_KEY: {
        name: 'Google Vertex AI - AAI - Default',
        credentialName: 'googleVertexAuth',
        mapFn: (value) => ({ googleApplicationCredential: value })
    },
    AAI_DEFAULT_N8N_API_KEY: {
        name: 'N8N - AAI - Default',
        credentialName: 'n8nApi',
        mapFn: (value) => ({ apiKey: value })
    },
    AAI_DEFAULT_REDIS_URL: {
        name: 'Redis URL - AAI - Default',
        credentialName: 'redisCacheUrlApi',
        mapFn: (value) => ({ redisUrl: value })
    },
    AAI_DEFAULT_DATA_ANALYZER: {
        name: 'Data Analyzer - AAI - Default',
        credentialName: 'dataAnalyzerApi',
        mapFn: (value) => ({ dataAnalyzerApiKey: value })
    },

    // Group mappings for multi-field credentials
    AAI_DEFAULT_AWS_BEDROCK: {
        name: 'AWS - AAI - Default',
        credentialName: 'awsApi',
        requiredVars: ['ACCESS_KEY', 'SECRET_KEY'],
        mapFn: (vars) => ({
            awsKey: vars['ACCESS_KEY'],
            awsSecret: vars['SECRET_KEY'],
            awsSession: vars['SESSION_TOKEN'] // Optional
        })
    },
    AAI_DEFAULT_SUPABASE: {
        name: 'Supabase - AAI - Default',
        credentialName: 'supabaseApi',
        requiredVars: ['URL', 'API'],
        mapFn: (vars) => ({
            supabaseApiKey: vars['API'],
            supabaseUrl: vars['URL']
        })
    },
    AAI_DEFAULT_GOOGLE_SEARCH_API: {
        name: 'Google Search API - AAI - Default',
        credentialName: 'googleCustomSearchApi',
        requiredVars: ['ENGINE_ID'],
        mapFn: (vars, apiKey) => ({
            googleCustomSearchApiKey: apiKey,
            googleCustomSearchApiId: vars['ENGINE_ID']
        })
    },
    AAI_DEFAULT_REDIS: {
        name: 'Redis - AAI - Default',
        credentialName: 'redisCacheApi',
        optionalVars: ['HOST', 'PORT', 'USERNAME', 'PASSWORD'],
        mapFn: (vars) => ({
            redisCacheHost: vars['HOST'] || 'localhost',
            redisCachePort: vars['PORT'] || '6379',
            redisCacheUser: vars['USERNAME'] || 'default',
            redisCachePwd: vars['PASSWORD'] || ''
        })
    },

    // Individual mappings for Contentful (matching exact env var names)
    AAI_DEFAULT_CONTENTFUL_DELIVERY_API_KEY: {
        name: 'Contentful Delivery - AAI - Default',
        credentialName: 'contentfulDeliveryApi',
        mapFn: (value) => ({ deliveryToken: value })
    },
    AAI_DEFAULT_CONTENTFUL_PREVIEW_API_KEY: {
        name: 'Contentful Preview - AAI - Default',
        credentialName: 'contentfulDeliveryApi',
        mapFn: (value) => ({ previewToken: value })
    },
    AAI_DEFAULT_CONTENTFUL_SPACE_ID: {
        name: 'Contentful Space - AAI - Default',
        credentialName: 'contentfulDeliveryApi',
        mapFn: (value) => ({ spaceId: value })
    },
    AAI_DEFAULT_CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: {
        name: 'Contentful Management - AAI - Default',
        credentialName: 'contentfulManagementApi',
        mapFn: (value) => ({ managementToken: value })
    },

    // Individual mappings for Confluence (matching exact env var names)
    AAI_DEFAULT_CONFLUENCE_CLOUD_API_KEY: {
        name: 'Confluence Cloud API Key - AAI - Default',
        credentialName: 'confluenceCloudApi',
        mapFn: (value) => ({ accessToken: value })
    },
    AAI_DEFAULT_CONFLUENCE_CLOUD_API_USERNAME: {
        name: 'Confluence Cloud Username - AAI - Default',
        credentialName: 'confluenceCloudApi',
        mapFn: (value) => ({ username: value })
    },

    // Group mapping for Postgres API (user + password)
    AAI_DEFAULT_POSTGRES_API: {
        name: 'Postgres API - AAI - Default',
        credentialName: 'PostgresApi',
        requiredVars: ['USER', 'PASSWORD'],
        mapFn: (vars) => ({
            user: vars['USER'],
            password: vars['PASSWORD']
        })
    },
    AAI_DEFAULT_POSTGRES_URL: {
        name: 'Postgres URL - AAI - Default',
        credentialName: 'PostgresUrl',
        mapFn: (value) => ({ postgresUrl: value })
    }
}

// Parse PostgreSQL connection URL
function parsePostgresUrl(url) {
    try {
        // Handle postgresql:// or postgres:// URLs
        const urlObj = new URL(url)

        if (!['postgresql:', 'postgres:'].includes(urlObj.protocol)) {
            throw new Error('URL must start with postgresql:// or postgres://')
        }

        return {
            host: urlObj.hostname,
            port: urlObj.port || '5432',
            username: urlObj.username,
            password: urlObj.password,
            database: urlObj.pathname.slice(1), // Remove leading slash
            type: 'postgres'
        }
    } catch (error) {
        throw new Error(`Invalid PostgreSQL URL: ${error.message}`)
    }
}

// Interactive prompt for PostgreSQL URL
function promptForPostgresUrl() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        console.log('\n' + '🔧 DATABASE CONNECTION FAILED!'.padStart(40, '=').padEnd(60, '='))
        console.log('Please provide your PostgreSQL connection URL.')
        console.log('')
        console.log('💡 Expected format:')
        console.log('   postgresql://username:password@host:port/database')
        console.log('')
        console.log('📝 Example:')
        console.log('   postgresql://admin:mypass@localhost:5432/mydb')
        console.log('   postgresql://user:pass@host.render.com/database_name')
        console.log('')

        rl.question('🔗 Enter your PostgreSQL URL: ', (url) => {
            rl.close()
            resolve(url.trim())
        })
    })
}

// Interactive prompt for USER_ID
function promptForUserId() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        console.log('\n' + '👤 USER_ID REQUIRED'.padStart(35, '=').padEnd(60, '='))
        console.log('USER_ID is required to assign credential ownership.')
        console.log('This must be a valid UUID of an existing user in your database.')
        console.log('')
        console.log('💡 Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
        console.log('📝 Example: 123e4567-e89b-12d3-a456-426614174000')
        console.log('')

        rl.question('👤 Enter USER_ID: ', (userId) => {
            rl.close()
            resolve(userId.trim())
        })
    })
}

// Interactive prompt for ORG_ID
function promptForOrgId() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        console.log('\n' + '🏢 ORG_ID REQUIRED'.padStart(35, '=').padEnd(60, '='))
        console.log('ORG_ID is required to assign credential organization.')
        console.log('This must be a valid UUID of an existing organization in your database.')
        console.log('')
        console.log('💡 Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
        console.log('📝 Example: 987fcdeb-51c2-43d1-9f4a-123456789abc')
        console.log('')

        rl.question('🏢 Enter ORG_ID: ', (orgId) => {
            rl.close()
            resolve(orgId.trim())
        })
    })
}

// Create database connection with fallback URL prompt
async function createDataSource() {
    let attempts = 0
    const maxAttempts = 2

    while (attempts < maxAttempts) {
        attempts++

        try {
            // Get current database configuration
            const dbType = process.env.DATABASE_TYPE || 'postgres'
            const dbHost = process.env.DATABASE_HOST || 'localhost'
            const dbPort = Number.parseInt(process.env.DATABASE_PORT || '5432', 10)
            const dbUser = process.env.DATABASE_USER || 'postgres'
            const dbPassword = process.env.DATABASE_PASSWORD || 'postgres'
            const dbName = process.env.DATABASE_NAME || 'flowise'

            console.log(`Connecting to ${dbType} database at ${dbHost}:${dbPort}/${dbName} (attempt ${attempts}/${maxAttempts})`)

            const dataSource = new DataSource({
                type: dbType,
                host: dbHost,
                port: dbPort,
                username: dbUser,
                password: dbPassword,
                database: dbName,
                synchronize: false,
                ssl:
                    dbHost.includes('.render.com') || dbHost.includes('.railway.app') || process.env.DATABASE_SSL
                        ? {
                              rejectUnauthorized: false // Allow self-signed certificates for cloud providers
                          }
                        : false
            })

            await dataSource.initialize()
            console.log('✅ Database connection initialized successfully')
            return dataSource
        } catch (error) {
            console.log(`❌ Database connection failed (attempt ${attempts}/${maxAttempts}): ${error.message}`)

            if (attempts >= maxAttempts) {
                // Last attempt failed, check for DATABASE_SECURE_EXTERNAL_URL first
                console.log('')
                console.log('🚨 All connection attempts failed!')

                let postgresUrl = process.env.DATABASE_SECURE_EXTERNAL_URL

                if (postgresUrl) {
                    console.log('\n📋 Found DATABASE_SECURE_EXTERNAL_URL environment variable')
                    console.log('🔗 Using URL from DATABASE_SECURE_EXTERNAL_URL...')
                } else {
                    console.log('\n💡 DATABASE_SECURE_EXTERNAL_URL not found, prompting for URL...')
                    postgresUrl = await promptForPostgresUrl()
                }

                try {
                    if (!postgresUrl) {
                        throw new Error('No URL provided')
                    }

                    console.log('\n📋 Parsing PostgreSQL URL...')
                    const parsedConfig = parsePostgresUrl(postgresUrl)

                    console.log('✅ URL parsed successfully:')
                    console.log(`   Host: ${parsedConfig.host}`)
                    console.log(`   Port: ${parsedConfig.port}`)
                    console.log(`   Database: ${parsedConfig.database}`)
                    console.log(`   Username: ${parsedConfig.username}`)
                    console.log(`   Password: ${'*'.repeat(Math.min(parsedConfig.password?.length || 0, 8))}`)

                    // Override environment variables with parsed values
                    process.env.DATABASE_TYPE = parsedConfig.type
                    process.env.DATABASE_HOST = parsedConfig.host
                    process.env.DATABASE_PORT = parsedConfig.port
                    process.env.DATABASE_USER = parsedConfig.username
                    process.env.DATABASE_PASSWORD = parsedConfig.password
                    process.env.DATABASE_NAME = parsedConfig.database

                    // Enable SSL for cloud providers
                    if (
                        parsedConfig.host.includes('.render.com') ||
                        parsedConfig.host.includes('.railway.app') ||
                        parsedConfig.host.includes('aws.com') ||
                        parsedConfig.host.includes('google.com')
                    ) {
                        process.env.DATABASE_SSL = 'true'
                    }

                    console.log('\n🔄 Retrying connection with parsed URL...')

                    const dataSource = new DataSource({
                        type: parsedConfig.type,
                        host: parsedConfig.host,
                        port: parseInt(parsedConfig.port),
                        username: parsedConfig.username,
                        password: parsedConfig.password,
                        database: parsedConfig.database,
                        synchronize: false,
                        ssl: {
                            rejectUnauthorized: false // Allow self-signed certificates (common for cloud providers)
                        }
                    })

                    await dataSource.initialize()
                    console.log('✅ Database connection successful with provided URL!')
                    return dataSource
                } catch (urlError) {
                    console.log(`❌ Failed to connect with provided URL: ${urlError.message}`)
                    throw new Error(`Database connection failed after all attempts. Last error: ${urlError.message}`)
                }
            } else {
                // Not the last attempt, continue to next iteration
                console.log('🔄 Retrying...')
                await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
            }
        }
    }
}

// Helper to encrypt credential data
function encryptCredentialData(plainDataObj) {
    // Use the same encryption key as the server
    const encryptKey = process.env.FLOWISE_SECRETKEY_OVERWRITE || 'theanswerencryptionkey'

    // Use CryptoJS exactly as the server does
    const CryptoJS = require('crypto-js')

    // This is exactly how the server encrypts credentials
    return CryptoJS.AES.encrypt(JSON.stringify(plainDataObj), encryptKey).toString()
}

// Find all environment variables with AAI_DEFAULT prefix
function findDefaultEnvVars() {
    // Get all environment variables
    const envVars = process.env
    const defaultVars = {}

    // Filter variables with AAI_DEFAULT prefix
    Object.keys(envVars).forEach((key) => {
        if (key.startsWith('AAI_DEFAULT_') && envVars[key]) {
            defaultVars[key] = envVars[key]
        }
    })

    return defaultVars
}

// Group related environment variables
function groupRelatedEnvVars(defaultVars) {
    const groupedVars = {}

    // First handle direct mappings
    Object.keys(ENV_TO_CREDENTIAL_MAP).forEach((key) => {
        if (defaultVars[key]) {
            const config = ENV_TO_CREDENTIAL_MAP[key]
            if (!config.requiredVars) {
                // This is a direct mapping
                groupedVars[key] = {
                    name: config.name,
                    credentialName: config.credentialName,
                    plainDataObj: config.mapFn(defaultVars[key])
                }
            }
        }
    })

    // Then handle group mappings that require multiple env vars
    Object.keys(ENV_TO_CREDENTIAL_MAP).forEach((prefix) => {
        const config = ENV_TO_CREDENTIAL_MAP[prefix]
        if (config.requiredVars || config.optionalVars) {
            const basePrefix = prefix
            const vars = {}

            // Check if we have all required variables for this group
            let hasAllRequired = true
            if (config.requiredVars) {
                config.requiredVars.forEach((suffix) => {
                    const fullKey = `${basePrefix}_${suffix}`
                    if (defaultVars[fullKey]) {
                        vars[suffix] = defaultVars[fullKey]
                    } else {
                        hasAllRequired = false
                    }
                })
            }

            // Add optional variables if they exist
            if (config.optionalVars) {
                config.optionalVars.forEach((suffix) => {
                    const fullKey = `${basePrefix}_${suffix}`
                    if (defaultVars[fullKey]) {
                        vars[suffix] = defaultVars[fullKey]
                    }
                })
            }

            // Only create credential if all required vars are present
            if (hasAllRequired && (Object.keys(vars).length > 0 || !config.requiredVars)) {
                groupedVars[basePrefix] = {
                    name: config.name,
                    credentialName: config.credentialName,
                    plainDataObj: config.mapFn(vars, defaultVars[basePrefix])
                }
            }
        }
    })

    return Object.values(groupedVars)
}

// Auto-detect credentials from unmapped AAI_DEFAULT_ environment variables
function detectUnmappedCredentials(defaultVars, mappedCredentials) {
    const unmappedCredentials = []
    const mappedKeys = new Set()

    // Collect all mapped keys
    mappedCredentials.forEach((cred) => {
        Object.keys(ENV_TO_CREDENTIAL_MAP).forEach((prefix) => {
            const config = ENV_TO_CREDENTIAL_MAP[prefix]
            if (config.name === cred.name) {
                mappedKeys.add(prefix)
                if (config.requiredVars || config.optionalVars) {
                    const varsToCheck = [...(config.requiredVars || []), ...(config.optionalVars || [])]
                    varsToCheck.forEach((suffix) => {
                        mappedKeys.add(`${prefix}_${suffix}`)
                    })
                }
            }
        })
    })

    // Group Postgres variants by their specific type
    const postgresGroups = {}
    const otherUnmapped = []

    // Find unmapped variables
    Object.keys(defaultVars).forEach((key) => {
        if (!mappedKeys.has(key)) {
            // Check if this is a Postgres variant (both AAI_DEFAULT_POSTGRES_ and POSTGRES_ patterns)
            if (key.startsWith('AAI_DEFAULT_POSTGRES_') || key.startsWith('POSTGRES_')) {
                const cleanKey = key.replace('AAI_DEFAULT_POSTGRES_', '').replace('POSTGRES_', '')
                const parts = cleanKey.split('_')
                const postgresType = parts[0].toLowerCase() // recordmanager, agentmemory, vectorstore, etc.

                if (!postgresGroups[postgresType]) {
                    postgresGroups[postgresType] = {
                        keys: [],
                        vars: {}
                    }
                }
                postgresGroups[postgresType].keys.push(key)
                postgresGroups[postgresType].vars[parts.slice(1).join('_').toLowerCase()] = defaultVars[key]
            } else {
                // Handle non-Postgres unmapped variables
                const parts = key.replace('AAI_DEFAULT_', '').split('_')
                const apiName = parts[0].toLowerCase()

                // Attempt to find matching credential file
                try {
                    const credentialFiles = fs.readdirSync(path.resolve(__dirname, '../../packages/components/credentials'))
                    const matchingFiles = credentialFiles.filter(
                        (file) => file.toLowerCase().includes(apiName) && file.endsWith('.credential.ts')
                    )

                    if (matchingFiles.length > 0) {
                        const credentialFile = matchingFiles[0]
                        const credName = credentialFile.replace('.credential.ts', '')

                        // Create a default mapping for this credential
                        const fieldName = `${apiName}ApiKey`
                        const plainData = {}
                        plainData[fieldName] = defaultVars[key]

                        // Capitalize the API name properly for prettier display
                        const prettyApiName = apiName.charAt(0).toUpperCase() + apiName.slice(1)

                        otherUnmapped.push({
                            name: `${prettyApiName} - AAI - Default`,
                            credentialName: `${apiName}Api`,
                            plainDataObj: plainData,
                            autoDetected: true
                        })

                        console.log(`Auto-detected credential for ${key} as ${credName}`)
                    }
                } catch (error) {
                    console.warn(`Could not auto-detect credential for ${key}:`, error.message)
                }
            }
        }
    })

    // Process Postgres groups
    Object.keys(postgresGroups).forEach((postgresType) => {
        const group = postgresGroups[postgresType]
        const vars = group.vars

        // Create a meaningful name for this Postgres variant
        const prettyType = postgresType.charAt(0).toUpperCase() + postgresType.slice(1)
        const name = `Postgres ${prettyType} - AAI - Default`

        // Map the variables to the appropriate Postgres credential fields
        const plainData = {}

        // Map common Postgres fields
        if (vars.database) plainData.database = vars.database
        if (vars.host) plainData.host = vars.host
        if (vars.user) plainData.user = vars.user
        if (vars.password) plainData.password = vars.password
        if (vars.port) plainData.port = vars.port
        if (vars.table_name) plainData.tableName = vars.table_name
        if (vars.content_column_name) plainData.contentColumnName = vars.content_column_name
        if (vars.ssl !== undefined) plainData.ssl = vars.ssl === 'true'

        unmappedCredentials.push({
            name: name,
            credentialName: 'PostgresApi',
            plainDataObj: plainData,
            autoDetected: true
        })

        console.log(`Auto-detected Postgres ${prettyType} credential with ${Object.keys(plainData).length} fields`)
    })

    // Add other unmapped credentials
    unmappedCredentials.push(...otherUnmapped)

    return unmappedCredentials
}

// Check if running in test mode
function isTestMode() {
    return process.argv.includes('--test') || process.argv.includes('--dry-run') || process.env.TEST_MODE === 'true'
}

// Check if running in auto-detect mode
function isAutoDetectMode() {
    return process.argv.includes('--auto-detect') || process.env.AUTO_DETECT === 'true'
}

// Check if running in update-env mode
function _isUpdateEnvMode() {
    return process.argv.includes('--update-env') || process.env.UPDATE_ENV === 'true'
}

// Detect local development scenario (single user and single org)
async function detectLocalDevScenario(dataSource) {
    try {
        // Query all users and organizations
        const usersQuery = `SELECT id, email, name, "createdDate" FROM "user" ORDER BY "createdDate" DESC`
        const orgsQuery = `SELECT id, name, "createdDate" FROM organization ORDER BY "createdDate" DESC`

        const users = await dataSource.query(usersQuery)
        const orgs = await dataSource.query(orgsQuery)

        const isLocalDev = users.length === 1 && orgs.length === 1

        return {
            isLocalDev,
            users,
            orgs,
            suggestedUser: users[0] || null,
            suggestedOrg: orgs[0] || null
        }
    } catch (error) {
        console.warn(`Could not detect local dev scenario: ${error.message}`)
        return {
            isLocalDev: false,
            users: [],
            orgs: [],
            suggestedUser: null,
            suggestedOrg: null
        }
    }
}

// Find .env file paths in order of preference
function findEnvFilePaths() {
    const paths = [
        path.resolve(process.cwd(), '.env'), // Current working directory (root)
        path.resolve(process.cwd(), '.env.local'), // Current working directory local
        path.resolve(__dirname, '../../.env'), // Project root (relative to script)
        path.resolve(__dirname, '../../.env.local'), // Project root local
        path.resolve(__dirname, '../.env'), // Scripts directory
        path.resolve(__dirname, './.env') // Current script directory
    ]

    // Filter existing files and deduplicate by canonical path
    const existingPaths = paths.filter((p) => fs.existsSync(p))
    const uniquePaths = []
    const seenPaths = new Set()

    for (const filePath of existingPaths) {
        try {
            const canonicalPath = fs.realpathSync(filePath)
            if (!seenPaths.has(canonicalPath)) {
                seenPaths.add(canonicalPath)
                uniquePaths.push(filePath)
            }
        } catch (error) {
            // If realpath fails, use the original path
            if (!seenPaths.has(filePath)) {
                seenPaths.add(filePath)
                uniquePaths.push(filePath)
            }
        }
    }

    return uniquePaths
}

// Read and parse .env file
function readEnvFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        const envVars = {}

        lines.forEach((line) => {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#')) {
                const equalIndex = trimmed.indexOf('=')
                if (equalIndex > 0) {
                    const key = trimmed.substring(0, equalIndex)
                    const value = trimmed.substring(equalIndex + 1)
                    envVars[key] = value
                }
            }
        })

        return { content, envVars }
    } catch (error) {
        return { content: '', envVars: {} }
    }
}

// Update .env file with new values
function updateEnvFile(filePath, userId, orgId) {
    try {
        const { content, envVars } = readEnvFile(filePath)

        // Update or add the values
        envVars.DATABASE_SEED_USER_ID = userId
        envVars.DATABASE_SEED_ORG_ID = orgId

        // Rebuild the content
        const lines = content.split('\n')
        const updatedLines = []
        const addedKeys = new Set()

        // Process existing lines
        lines.forEach((line) => {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#')) {
                const equalIndex = trimmed.indexOf('=')
                if (equalIndex > 0) {
                    const key = trimmed.substring(0, equalIndex)
                    if (key === 'DATABASE_SEED_USER_ID' || key === 'DATABASE_SEED_ORG_ID') {
                        // Update existing line
                        updatedLines.push(`${key}="${envVars[key]}"`)
                        addedKeys.add(key)
                    } else {
                        // Keep existing line
                        updatedLines.push(line)
                    }
                } else {
                    updatedLines.push(line)
                }
            } else {
                updatedLines.push(line)
            }
        })

        // Add new lines for missing keys
        if (!addedKeys.has('DATABASE_SEED_USER_ID') || !addedKeys.has('DATABASE_SEED_ORG_ID')) {
            // Add a newline before new variables if the file doesn't end with one
            if (updatedLines.length > 0 && !updatedLines[updatedLines.length - 1].endsWith('\n')) {
                updatedLines.push('')
            }
        }

        if (!addedKeys.has('DATABASE_SEED_USER_ID')) {
            updatedLines.push(`DATABASE_SEED_USER_ID="${userId}"`)
        }
        if (!addedKeys.has('DATABASE_SEED_ORG_ID')) {
            updatedLines.push(`DATABASE_SEED_ORG_ID="${orgId}"`)
        }

        // Write back to file with proper newlines
        let updatedContent = updatedLines.join('\n')

        // Ensure there's a newline at the end
        if (!updatedContent.endsWith('\n')) {
            updatedContent += '\n'
        }

        fs.writeFileSync(filePath, updatedContent)

        return true
    } catch (error) {
        console.error(`Error updating .env file: ${error.message}`)
        return false
    }
}

// Interactive prompt for .env file update
async function promptForEnvFileUpdate(userId, orgId) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        console.log('\n' + '📝 ENVIRONMENT FILE UPDATE (OPTIONAL)'.padStart(35, '=').padEnd(60, '='))
        console.log('Would you like to automatically save these values to a .env file?')
        console.log('')
        console.log('💡 This will prevent you from having to enter these values again.')
        console.log('   (The export commands will be shown at the end regardless)')
        console.log('')

        const envFiles = findEnvFilePaths()
        if (envFiles.length > 0) {
            console.log('📁 Found existing .env files:')
            envFiles.forEach((file, index) => {
                const absolutePath = path.resolve(file)
                console.log(`   ${index + 1}. ${absolutePath}`)
            })
            console.log('')
        }

        console.log('Options:')
        console.log('   y - Update the first found .env file')
        console.log("   n - Don't update any files (.env entries shown at end)")
        console.log('')

        rl.question('🔧 Your choice (y/n): ', (answer) => {
            rl.close()
            const choice = answer.trim().toLowerCase()

            if (choice === 'y' && envFiles.length > 0) {
                const targetFile = envFiles[0]
                const success = updateEnvFile(targetFile, userId, orgId)

                if (success) {
                    const absolutePath = path.resolve(targetFile)
                    console.log(`✅ Updated ${absolutePath} with your values`)
                    console.log('💡 Next time you run this script, it will use these values automatically')
                } else {
                    console.log('❌ Failed to update .env file')
                }
            } else {
                console.log('💡 No .env file updated. .env entries will be shown at the end.')
            }

            resolve()
        })
    })
}

// Enhanced prompt with auto-detection
async function enhancedPromptWithAutoDetection(dataSource, promptType) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise(async (resolve) => {
        // First, detect local dev scenario
        const localDev = await detectLocalDevScenario(dataSource)

        if (localDev.isLocalDev && (isAutoDetectMode() || promptType === 'user' || promptType === 'both')) {
            const user = localDev.suggestedUser
            const org = localDev.suggestedOrg

            console.log('\n' + '🤖 AUTO-DETECTION ENABLED'.padStart(35, '=').padEnd(60, '='))
            console.log('Found local development scenario:')
            console.log(`   👤 Single user: ${user.email || '(no email)'} - ${user.name || '(no name)'}`)
            console.log(`   🏢 Single organization: ${org.name || '(no name)'}`)
            console.log('')
            console.log('💡 These values will be used automatically for credential assignment.')
            console.log('')

            if (promptType === 'user') {
                console.log('👤 Auto-selected USER_ID:')
                console.log(`   ID: ${user.id}`)
                console.log(`   Email: ${user.email || '(no email)'}`)
                console.log(`   Name: ${user.name || '(no name)'}`)
                console.log('')

                rl.question('✅ Use this user? (Y/n): ', async (answer) => {
                    rl.close()
                    const choice = answer.trim().toLowerCase()
                    if (choice === '' || choice === 'y' || choice === 'yes') {
                        resolve(user.id)
                    } else {
                        // Fall back to manual selection
                        await showAvailableUsersAndOrgs(dataSource)
                        const userId = await promptForUserId()
                        resolve(userId)
                    }
                })
            } else if (promptType === 'org') {
                console.log('🏢 Auto-selected ORG_ID:')
                console.log(`   ID: ${org.id}`)
                console.log(`   Name: ${org.name || '(no name)'}`)
                console.log('')

                rl.question('✅ Use this organization? (Y/n): ', async (answer) => {
                    rl.close()
                    const choice = answer.trim().toLowerCase()
                    if (choice === '' || choice === 'y' || choice === 'yes') {
                        resolve(org.id)
                    } else {
                        // Fall back to manual selection
                        await showAvailableUsersAndOrgs(dataSource)
                        const orgId = await promptForOrgId()
                        resolve(orgId)
                    }
                })
            } else if (promptType === 'both') {
                console.log('👤 Auto-selected USER_ID:')
                console.log(`   ID: ${user.id}`)
                console.log(`   Email: ${user.email || '(no email)'}`)
                console.log(`   Name: ${user.name || '(no name)'}`)
                console.log('')
                console.log('🏢 Auto-selected ORG_ID:')
                console.log(`   ID: ${org.id}`)
                console.log(`   Name: ${org.name || '(no name)'}`)
                console.log('')

                rl.question('✅ Use these user and organization? (Y/n): ', async (answer) => {
                    rl.close()
                    const choice = answer.trim().toLowerCase()
                    if (choice === '' || choice === 'y' || choice === 'yes') {
                        resolve({ userId: user.id, orgId: org.id })
                    } else {
                        // Fall back to manual selection
                        await showAvailableUsersAndOrgs(dataSource)
                        const userId = await promptForUserId()
                        const orgId = await promptForOrgId()
                        resolve({ userId, orgId })
                    }
                })
            }
        } else {
            // Not local dev or auto-detect disabled, show available options
            await showAvailableUsersAndOrgs(dataSource)

            if (promptType === 'user') {
                rl.close()
                const userId = await promptForUserId()
                resolve(userId)
            } else if (promptType === 'org') {
                rl.close()
                const orgId = await promptForOrgId()
                resolve(orgId)
            } else if (promptType === 'both') {
                rl.close()
                const userId = await promptForUserId()
                const orgId = await promptForOrgId()
                resolve({ userId, orgId })
            }
        }
    })
}

// Helper function to show available users and organizations
async function showAvailableUsersAndOrgs(dataSource) {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 AVAILABLE USERS & ORGANIZATIONS')
    console.log('='.repeat(60))

    try {
        // Show available users
        console.log('👥 AVAILABLE USERS:')
        const usersQuery = `SELECT id, email, name, "createdDate" FROM "user" ORDER BY "createdDate" DESC LIMIT 10`
        const users = await dataSource.query(usersQuery)

        if (users.length > 0) {
            users.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.email || '(no email)'} - ${user.name || '(no name)'}`)
                console.log(`      ID: ${user.id}`)
                console.log(`      Created: ${user.createdDate}`)
                console.log('')
            })
        } else {
            console.log('   No users found in database')
        }

        // Show available organizations
        console.log('🏢 AVAILABLE ORGANIZATIONS:')
        const orgsQuery = `SELECT id, name, "createdDate" FROM organization ORDER BY "createdDate" DESC LIMIT 10`
        const orgs = await dataSource.query(orgsQuery)

        if (orgs.length > 0) {
            orgs.forEach((org, index) => {
                console.log(`   ${index + 1}. ${org.name || '(no name)'}`)
                console.log(`      ID: ${org.id}`)
                console.log(`      Created: ${org.createdDate}`)
                console.log('')
            })
        } else {
            console.log('   No organizations found in database')
        }

        console.log('💡 TO USE THESE VALUES:')
        console.log('   export USER_ID="<copy-user-id-from-above>"')
        console.log('   export ORG_ID="<copy-org-id-from-above>"')
    } catch (error) {
        console.log(`❌ Error querying available users/orgs: ${error.message}`)
        console.log('   Tables might not exist or have different schema')
    }

    console.log('='.repeat(60))
}

// Query user and organization details from database
async function queryUserOrgDetails(dataSource) {
    const userId = process.env.DATABASE_SEED_USER_ID
    const orgId = process.env.DATABASE_SEED_ORG_ID

    console.log('\n' + '='.repeat(60))
    console.log('👤 USER & ORGANIZATION VERIFICATION')
    console.log('='.repeat(60))

    // Show the IDs we're using
    console.log(`DATABASE_SEED_USER_ID: ${userId || '❌ (not set)'}`)
    console.log(`DATABASE_SEED_ORG_ID: ${orgId || '❌ (not set)'}`)

    if (!userId && !orgId) {
        console.log('\n⚠️  WARNING: Both DATABASE_SEED_USER_ID and DATABASE_SEED_ORG_ID are missing!')
        console.log('   Credentials will not be properly assigned to a user/organization.')
        console.log('='.repeat(60))
        return { userExists: false, orgExists: false }
    }

    try {
        let userDetails = null
        let orgDetails = null

        // Query user details if DATABASE_SEED_USER_ID is set
        if (userId) {
            try {
                const userQuery = `SELECT id, email, name, "createdDate", "updatedDate" FROM "user" WHERE id = $1 LIMIT 1`
                const userResult = await dataSource.query(userQuery, [userId])

                if (userResult.length > 0) {
                    userDetails = userResult[0]
                    console.log('\n✅ USER FOUND:')
                    console.log(`   ID: ${userDetails.id}`)
                    console.log(`   Email: ${userDetails.email || '(no email)'}`)
                    console.log(`   Name: ${userDetails.name || '(no name)'}`)
                    console.log(`   Created: ${userDetails.createdDate}`)
                    console.log(`   Updated: ${userDetails.updatedDate}`)
                } else {
                    console.log('\n❌ USER NOT FOUND:')
                    console.log(`   The DATABASE_SEED_USER_ID "${userId}" does not exist in the database`)
                    console.log('   This will create orphaned credentials!')
                }
            } catch (error) {
                console.log(`\n⚠️  Error querying user table: ${error.message}`)
                console.log('   (Table might not exist or have different schema)')
            }
        }

        // Query organization details if DATABASE_SEED_ORG_ID is set
        if (orgId) {
            try {
                const orgQuery = `SELECT id, name, "createdDate", "updatedDate" FROM organization WHERE id = $1 LIMIT 1`
                const orgResult = await dataSource.query(orgQuery, [orgId])

                if (orgResult.length > 0) {
                    orgDetails = orgResult[0]
                    console.log('\n✅ ORGANIZATION FOUND:')
                    console.log(`   ID: ${orgDetails.id}`)
                    console.log(`   Name: ${orgDetails.name || '(no name)'}`)
                    console.log(`   Created: ${orgDetails.createdDate}`)
                    console.log(`   Updated: ${orgDetails.updatedDate}`)
                } else {
                    console.log('\n❌ ORGANIZATION NOT FOUND:')
                    console.log(`   The DATABASE_SEED_ORG_ID "${orgId}" does not exist in the database`)
                    console.log('   This will create orphaned credentials!')
                }
            } catch (error) {
                console.log(`\n⚠️  Error querying organization table: ${error.message}`)
                console.log('   (Table might not exist or have different schema)')
            }
        }

        console.log('='.repeat(60))

        return {
            userExists: userDetails !== null,
            orgExists: orgDetails !== null,
            userDetails,
            orgDetails
        }
    } catch (error) {
        console.log(`\n❌ Error verifying user/org details: ${error.message}`)
        console.log('='.repeat(60))
        return { userExists: false, orgExists: false }
    }
}

// Display database connection information
function displayDatabaseInfo() {
    const dbType = process.env.DATABASE_TYPE || 'postgres'
    const dbHost = process.env.DATABASE_HOST || 'localhost'
    const dbPort = process.env.DATABASE_PORT || '5432'
    const dbUser = process.env.DATABASE_USER || 'postgres'
    const dbName = process.env.DATABASE_NAME || 'flowise'
    const userId = process.env.DATABASE_SEED_USER_ID
    const orgId = process.env.DATABASE_SEED_ORG_ID

    const testMode = isTestMode()

    console.log('\n' + '='.repeat(60))
    console.log('🗄️  DATABASE CONNECTION INFORMATION')
    console.log('='.repeat(60))
    console.log(
        `Mode: ${
            testMode
                ? '🧪 TEST/DRY-RUN (read-only, default for pnpm seed-credentials)'
                : '🚀 PRODUCTION (write operations, pnpm seed-credentials:write)'
        }`
    )
    console.log(`Database Type: ${dbType}`)
    console.log(`Host: ${dbHost}`)
    console.log(`Port: ${dbPort}`)
    console.log(`Database Name: ${dbName}`)
    console.log(`Username: ${dbUser}`)
    console.log(`Password: ${'*'.repeat(8)} (hidden for security)`)
    console.log('')
    console.log('CREDENTIAL OWNERSHIP:')
    console.log(`User ID: ${userId ? `✅ ${userId}` : '❌ (not set - credentials will be orphaned!)'}`)
    console.log(`Org ID: ${orgId ? `✅ ${orgId}` : '❌ (not set - credentials will be orphaned!)'}`)
    console.log('='.repeat(60))
}

async function seedCredentials() {
    const testMode = isTestMode()

    if (testMode) {
        console.log('🧪 RUNNING IN TEST MODE (DRY RUN, DEFAULT FOR pnpm seed-credentials)')
        console.log('   No changes will be made to the database')
        console.log('   This will only show existing credentials and what would be processed')
        console.log('   To actually write credentials, use: pnpm seed-credentials:write')
    } else {
        console.log('🚀 RUNNING IN PRODUCTION MODE (pnpm seed-credentials:write)')
        console.log('   This will create/update credentials in the database')
    }

    // Display database connection info
    displayDatabaseInfo()

    let dataSource

    try {
        // Initialize database connection with fallback URL prompt
        dataSource = await createDataSource()

        // Verify user and organization details in database
        const userOrgVerification = await queryUserOrgDetails(dataSource)

        // =====================================================
        // ⚠️  IMPORTANT: DATABASE_SEED_USER_ID AND DATABASE_SEED_ORG_ID CONFIGURATION  ⚠️
        // =====================================================
        console.log('\n' + '='.repeat(60))
        console.log('🔍 CHECKING DATABASE_SEED_USER_ID AND DATABASE_SEED_ORG_ID CONFIGURATION')
        console.log('='.repeat(60))

        // Get user ID and org ID (with interactive prompting for missing values)
        let userId = process.env.DATABASE_SEED_USER_ID
        let orgId = process.env.DATABASE_SEED_ORG_ID

        // Make sure the ID values are valid UUIDs or null
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

        // Track whether we prompted for values (before overriding environment)
        let promptedForUserId = false
        let promptedForOrgId = false

        // Enhanced prompting with auto-detection for missing values
        if (!userId || !orgId) {
            console.log('\n⚠️  Missing DATABASE_SEED_USER_ID or DATABASE_SEED_ORG_ID in environment variables')
            const result = await enhancedPromptWithAutoDetection(dataSource, 'both')

            if (!result.userId || !result.orgId) {
                console.log('❌ Both DATABASE_SEED_USER_ID and DATABASE_SEED_ORG_ID are required. Cannot proceed.')
                process.exit(1)
            }

            userId = result.userId
            orgId = result.orgId
            promptedForUserId = !process.env.DATABASE_SEED_USER_ID
            promptedForOrgId = !process.env.DATABASE_SEED_ORG_ID

            // Override environment for this session
            process.env.DATABASE_SEED_USER_ID = userId
            process.env.DATABASE_SEED_ORG_ID = orgId
        }

        // Validate UUID format
        const hasValidUserId = userId && uuidRegex.test(userId)
        const hasValidOrgId = orgId && uuidRegex.test(orgId)

        // If we prompted for values, we need to re-verify them in the database
        let userOrgVerificationUpdated = userOrgVerification
        if (promptedForUserId || promptedForOrgId) {
            console.log('\n🔄 Re-verifying prompted DATABASE_SEED_USER_ID and DATABASE_SEED_ORG_ID in database...')
            userOrgVerificationUpdated = await queryUserOrgDetails(dataSource)
        }

        // Check if DATABASE_SEED_USER_ID and DATABASE_SEED_ORG_ID are valid UUIDs AND exist in database
        const userIdValid = hasValidUserId && userOrgVerificationUpdated.userExists
        const orgIdValid = hasValidOrgId && userOrgVerificationUpdated.orgExists

        if (!hasValidUserId && !hasValidOrgId) {
            console.log('❌ CRITICAL ERROR: Both DATABASE_SEED_USER_ID and DATABASE_SEED_ORG_ID are missing or invalid!')
            console.log('')
            console.log('🚫 SCRIPT EXECUTION TERMINATED')
            if (testMode) {
                console.log('   Cannot analyze credentials without proper owner assignment values.')
                console.log('   Even in test mode, these values are required for proper analysis.')
            } else {
                console.log('   Cannot create credentials without proper owner assignment.')
                console.log('   This would create orphaned credentials with access issues.')
            }
            console.log('')
            console.log('🔧 TO FIX THIS, SET THE FOLLOWING ENVIRONMENT VARIABLES:')
            console.log('   export DATABASE_SEED_USER_ID="your-user-uuid-here"')
            console.log('   export DATABASE_SEED_ORG_ID="your-organization-uuid-here"')
            console.log('')
            console.log('📋 HOW TO GET THESE VALUES:')
            console.log('   1. DATABASE_SEED_USER_ID: Query your users table or check the Flowise admin panel')
            console.log('   2. DATABASE_SEED_ORG_ID: Query your organizations table or check the Flowise admin panel')
            console.log('   3. Both values must be valid UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)')
            console.log('')
            console.log('💡 EXAMPLE:')
            console.log('   export DATABASE_SEED_USER_ID="123e4567-e89b-12d3-a456-426614174000"')
            console.log('   export DATABASE_SEED_ORG_ID="987fcdeb-51d2-43a1-b123-456789abcdef"')
            console.log(`   node scripts/seed-credentials/seed-credentials.js${testMode ? ' --test' : ''}`)
            console.log('')
            console.log('='.repeat(60))

            process.exit(1)
        } else if (!hasValidUserId || !userIdValid) {
            console.log('❌ CRITICAL ERROR: DATABASE_SEED_USER_ID is missing, invalid, or user not found in database!')
            console.log(`   Current value: "${userId || '(not set)'}"`)
            if (hasValidUserId && !userOrgVerificationUpdated.userExists) {
                console.log('   UUID format is valid, but user does not exist in database!')
            }
            console.log('')
            console.log('🚫 SCRIPT EXECUTION TERMINATED')
            console.log('   DATABASE_SEED_USER_ID must be valid and exist in the database for proper credential ownership.')
            console.log('')
            console.log('🔧 FIX OPTIONS:')
            console.log('   1. Set correct DATABASE_SEED_USER_ID: export DATABASE_SEED_USER_ID="valid-user-uuid-from-database"')
            console.log('   2. Query database: SELECT id, email, name FROM "user" LIMIT 10;')
            console.log('')

            // Show available users/orgs in test mode to help user find correct IDs
            if (testMode) {
                await showAvailableUsersAndOrgs(dataSource)
            } else {
                console.log('='.repeat(60))
            }

            process.exit(1)
        } else if (!hasValidOrgId || !orgIdValid) {
            console.log('❌ CRITICAL ERROR: DATABASE_SEED_ORG_ID is missing, invalid, or organization not found in database!')
            console.log(`   Current value: "${orgId || '(not set)'}"`)
            if (hasValidOrgId && !userOrgVerificationUpdated.orgExists) {
                console.log('   UUID format is valid, but organization does not exist in database!')
            }
            console.log('')
            console.log('🚫 SCRIPT EXECUTION TERMINATED')
            console.log('   DATABASE_SEED_ORG_ID must be valid and exist in the database for proper credential organization.')
            console.log('')
            console.log('🔧 FIX OPTIONS:')
            console.log('   1. Set correct DATABASE_SEED_ORG_ID: export DATABASE_SEED_ORG_ID="valid-org-uuid-from-database"')
            console.log('   2. Query database: SELECT id, name FROM organization LIMIT 10;')
            console.log('')

            // Show available users/orgs in test mode to help user find correct IDs
            if (testMode) {
                await showAvailableUsersAndOrgs(dataSource)
            } else {
                console.log('='.repeat(60))
            }

            process.exit(1)
        } else {
            console.log('\n✅ DATABASE_SEED_USER_ID and DATABASE_SEED_ORG_ID are properly configured and verified in database!')
        }

        // Offer to update .env file if we prompted for values
        if (promptedForUserId || promptedForOrgId) {
            await promptForEnvFileUpdate(userId, orgId)
        }

        // Always display the .env file entries for easy copying
        if (userId && orgId) {
            // Note: This is a local development script that intentionally displays user/org IDs
            // for convenience. These are not sensitive production secrets but local dev identifiers.
            // CodeQL: This is intentional for local development - user/org IDs are not sensitive secrets
            /* eslint-disable-next-line security/detect-object-injection, security/detect-non-literal-regexp */
            /* codeql-disable-next-line js/clear-text-logging */
            console.log('\n' + '📋 ADD TO YOUR .ENV FILE'.padStart(35, '=').padEnd(60, '='))
            console.log('Add these lines to your .env file to avoid prompts next time:')
            console.log('')
            console.log(`DATABASE_SEED_USER_ID="${userId}"`)
            console.log(`DATABASE_SEED_ORG_ID="${orgId}"`)
            console.log('')
            console.log('💡 Location: .env (in project root)')
            console.log('='.repeat(60))
        }

        console.log('')
        console.log('📊 FINAL CONFIGURATION:')
        console.log(`   User ID: ${userId ? `✅ ${userId}` : '❌ NULL (not set)'}`)
        console.log(`   Organization ID: ${orgId ? `✅ ${orgId}` : '❌ NULL (not set)'}`)
        console.log('='.repeat(60) + '\n')

        // Find all AAI_DEFAULT environment variables
        const defaultVars = findDefaultEnvVars()
        console.log(`Found ${Object.keys(defaultVars).length} AAI_DEFAULT variables`)

        // Group related environment variables
        let credentialsToCreate = groupRelatedEnvVars(defaultVars)
        console.log(`Mapped ${credentialsToCreate.length} credential configurations`)

        // Auto-detect unmapped credentials
        const unmappedCredentials = detectUnmappedCredentials(defaultVars, credentialsToCreate)
        console.log(`Auto-detected ${unmappedCredentials.length} additional credentials`)

        // Combine mapped and auto-detected credentials
        credentialsToCreate = [...credentialsToCreate, ...unmappedCredentials]

        if (testMode) {
            console.log('\n' + '='.repeat(60))
            console.log('🧪 TEST MODE: CREDENTIAL ANALYSIS')
            console.log('='.repeat(60))
            console.log(`Found ${credentialsToCreate.length} credentials to process`)
            console.log('')

            if (credentialsToCreate.length === 0) {
                console.log('❌ No credentials found to process!')
                console.log('   Make sure you have AAI_DEFAULT_* environment variables set')
                return { created: [], failed: [], existing: [] }
            }

            // In test mode, just check what exists and what would be processed
            const results = {
                existing: [],
                wouldCreate: [],
                wouldUpdate: []
            }

            for (const credential of credentialsToCreate) {
                console.log(`\n🔍 Analyzing: ${credential.name}`)

                try {
                    // Check if credential exists
                    const existingCredentialSql = `SELECT id, "createdDate", "updatedDate" FROM credential WHERE name = $1 LIMIT 1`
                    const existingCredentials = await dataSource.query(existingCredentialSql, [credential.name])

                    if (existingCredentials.length > 0) {
                        const existing = existingCredentials[0]
                        console.log(`   ✅ EXISTS - UUID: ${existing.id}`)
                        console.log(`   📅 Created: ${existing.createdDate}`)
                        console.log(`   📅 Updated: ${existing.updatedDate}`)
                        console.log(`   🔄 ACTION: Would UPDATE (preserve UUID)`)

                        results.wouldUpdate.push({
                            name: credential.name,
                            id: existing.id,
                            credentialName: credential.credentialName,
                            autoDetected: credential.autoDetected
                        })
                    } else {
                        console.log(`   ➕ NOT FOUND`)
                        console.log(`   🔄 ACTION: Would CREATE (new UUID)`)

                        results.wouldCreate.push({
                            name: credential.name,
                            credentialName: credential.credentialName,
                            autoDetected: credential.autoDetected
                        })
                    }

                    // Show credential data summary (without sensitive info)
                    const fieldCount = Object.keys(credential.plainDataObj).length
                    const fieldNames = Object.keys(credential.plainDataObj).join(', ')
                    console.log(`   📋 Fields (${fieldCount}): ${fieldNames}`)
                } catch (error) {
                    console.log(`   ❌ ERROR: ${error.message}`)
                }
            }

            // Show test mode summary
            console.log('\n' + '='.repeat(60))
            console.log('🧪 TEST MODE SUMMARY')
            console.log('='.repeat(60))
            console.log(`Would CREATE: ${results.wouldCreate.length} new credentials`)
            console.log(`Would UPDATE: ${results.wouldUpdate.length} existing credentials`)
            console.log(`Total processed: ${credentialsToCreate.length}`)

            if (results.wouldUpdate.length > 0) {
                console.log('\n📝 EXISTING CREDENTIALS (would be updated):')
                for (const cred of results.wouldUpdate) {
                    const type = cred.autoDetected ? '🤖 Auto-detected' : '📋 Mapped'
                    console.log(`   ${type}: ${cred.name}`)
                    console.log(`     UUID: ${cred.id}`)
                    console.log(`     Type: ${cred.credentialName}`)
                }
            }

            if (results.wouldCreate.length > 0) {
                console.log('\n🆕 NEW CREDENTIALS (would be created):')
                for (const cred of results.wouldCreate) {
                    const type = cred.autoDetected ? '🤖 Auto-detected' : '📋 Mapped'
                    console.log(`   ${type}: ${cred.name}`)
                    console.log(`     Type: ${cred.credentialName}`)
                }
            }

            console.log('\n💡 To run in production mode: pnpm seed-credentials:write')
            console.log('='.repeat(60))

            return results
        }

        // PRODUCTION MODE - Actually create/update credentials
        console.log('\n' + '='.repeat(60))
        console.log('🚀 PRODUCTION MODE: PROCESSING CREDENTIALS')
        console.log('='.repeat(60))

        // Ensure credential table exists
        try {
            const tableExistsQuery = `SELECT to_regclass('public.credential') as exists;`
            const tableCheck = await dataSource.query(tableExistsQuery)
            const tableExists = tableCheck[0].exists !== null

            if (!tableExists) {
                console.log('Credentials table not found, creating it...')
                const createTableSql = `
                CREATE TABLE IF NOT EXISTS credential (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    "credentialName" VARCHAR(255) NOT NULL,
                    "encryptedData" TEXT NOT NULL,
                    "createdDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    "updatedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    "userId" UUID,
                    "organizationId" UUID,
                    visibility TEXT[] DEFAULT '{Private}'
                );`
                await dataSource.query(createTableSql)
                console.log('Created credentials table')
            }
        } catch (error) {
            console.warn('Error checking/creating table, will try to proceed anyway:', error.message)
        }

        const results = {
            created: [],
            failed: [],
            existing: []
        }

        // Process each credential
        for (const credential of credentialsToCreate) {
            console.log(`Processing credential: ${credential.name} (${credential.credentialName})`)

            // Check if we have data for this credential
            const requiredFieldsCount = Object.keys(credential.plainDataObj).length
            const providedFieldsCount = Object.values(credential.plainDataObj).filter((v) => v).length

            if (providedFieldsCount === 0) {
                console.error(`Error: No valid data found for ${credential.name}`)
                results.failed.push({ name: credential.name, reason: 'No valid data provided' })
                continue
            }

            if (providedFieldsCount < requiredFieldsCount) {
                console.warn(`Warning: Only ${providedFieldsCount}/${requiredFieldsCount} fields found for ${credential.name}`)
            }

            try {
                // Encrypt the credential data
                const encryptedData = encryptCredentialData(credential.plainDataObj)

                // Check if credential already exists using raw SQL
                const existingCredentialSql = `
                    SELECT id FROM credential WHERE name = $1 LIMIT 1
                `
                const existingCredentials = await dataSource.query(existingCredentialSql, [credential.name])

                let credentialId
                let isUpdate = false

                if (existingCredentials.length > 0) {
                    // Update existing credential to preserve UUID
                    credentialId = existingCredentials[0].id
                    console.log(`Updating existing credential '${credential.name}' with ID: ${credentialId}`)

                    const updateSql = `
                        UPDATE credential 
                        SET "credentialName" = $1,
                            "encryptedData" = $2,
                            "userId" = $3,
                            "organizationId" = $4,
                            "updatedDate" = CURRENT_TIMESTAMP,
                            visibility = ARRAY[$5]::text[]
                        WHERE id = $6
                    `

                    const updateValues = [credential.credentialName, encryptedData, userId || null, orgId || null, 'Private', credentialId]

                    await dataSource.query(updateSql, updateValues)
                    console.log(`Updated credential '${credential.name}' (preserved UUID: ${credentialId})`)
                    isUpdate = true
                } else {
                    // Create new credential
                    console.log(`Creating new credential '${credential.name}'`)

                    const insertSql = `
                        INSERT INTO credential (
                            name, 
                            "credentialName", 
                            "encryptedData", 
                            "userId", 
                            "organizationId", 
                            visibility
                        ) 
                        VALUES ($1, $2, $3, $4, $5, ARRAY[$6]::text[])
                        RETURNING id
                    `

                    const insertValues = [
                        credential.name,
                        credential.credentialName,
                        encryptedData,
                        userId || null,
                        orgId || null,
                        'Private'
                    ]

                    const result = await dataSource.query(insertSql, insertValues)
                    credentialId = result[0].id
                    console.log(`Created new credential '${credential.name}' with ID: ${credentialId}`)
                }

                results.created.push({
                    name: credential.name,
                    id: credentialId,
                    autoDetected: credential.autoDetected,
                    isUpdate: isUpdate
                })
            } catch (error) {
                console.error(`Error creating credential for ${credential.name}:`, error.message)
                results.failed.push({
                    name: credential.name,
                    reason: error.message
                })
            }
        }

        // Show summary
        console.log('\n===== CREDENTIAL SEEDING SUMMARY =====')
        const createdCount = results.created.filter((cred) => !cred.isUpdate).length
        const updatedCount = results.created.filter((cred) => cred.isUpdate).length

        console.log(`New credentials created: ${createdCount}`)
        console.log(`Existing credentials updated: ${updatedCount}`)
        console.log(`Failed: ${results.failed.length}`)

        if (results.created.length > 0) {
            // Show updated credentials first
            const updatedCreds = results.created.filter((cred) => cred.isUpdate)
            if (updatedCreds.length > 0) {
                console.log('\n📝 UPDATED CREDENTIALS (UUID preserved):')

                const updatedManual = updatedCreds.filter((cred) => !cred.autoDetected)
                if (updatedManual.length > 0) {
                    console.log('\n  Mapped credentials:')
                    for (const cred of updatedManual) {
                        console.log(`  ✅ ${cred.name}: ${cred.id}`)
                    }
                }

                const updatedAuto = updatedCreds.filter((cred) => cred.autoDetected)
                if (updatedAuto.length > 0) {
                    console.log('\n  Auto-detected credentials:')
                    for (const cred of updatedAuto) {
                        console.log(`  ✅ ${cred.name}: ${cred.id}`)
                    }
                }
            }

            // Show new credentials
            const newCreds = results.created.filter((cred) => !cred.isUpdate)
            if (newCreds.length > 0) {
                console.log('\n🆕 NEW CREDENTIALS CREATED:')

                const newManual = newCreds.filter((cred) => !cred.autoDetected)
                if (newManual.length > 0) {
                    console.log('\n  Mapped credentials:')
                    for (const cred of newManual) {
                        console.log(`  ➕ ${cred.name}: ${cred.id}`)
                    }
                }

                const newAuto = newCreds.filter((cred) => cred.autoDetected)
                if (newAuto.length > 0) {
                    console.log('\n  Auto-detected credentials:')
                    for (const cred of newAuto) {
                        console.log(`  ➕ ${cred.name}: ${cred.id}`)
                    }
                }
            }
        }

        if (results.failed.length > 0) {
            console.log('\nFailed credentials:')
            for (const cred of results.failed) {
                console.log(`- ${cred.name}: ${cred.reason}`)
            }
        }

        return results
    } catch (error) {
        console.error('Error:', error)
        console.error('Make sure your database connection settings are correct')
        process.exit(1)
    } finally {
        // Close database connection
        if (dataSource?.isInitialized) {
            await dataSource.destroy()
            console.log('Database connection closed')
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const testMode = isTestMode()

    seedCredentials()
        .then(() => {
            if (testMode) {
                console.log('\n✅ Test mode analysis completed - no changes were made')
                console.log('💡 Run without --test to actually create/update credentials')
            } else {
                console.log('\n✅ Credential seeding completed successfully')
            }
        })
        .catch((error) => {
            console.error('\n❌ Error during credential seeding:', error)
            process.exit(1)
        })
}

module.exports = {
    seedCredentials
}
