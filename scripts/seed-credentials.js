/**
 * Seed all default credentials from AAI_DEFAULT environment variables
 * This script automatically detects all AAI_DEFAULT_* variables and creates credentials for them
 */
const path = require('node:path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { DataSource } = require('typeorm')
const fs = require('node:fs')
const crypto = require('node:crypto')

// Map of environment variable prefixes to credential configurations
const ENV_TO_CREDENTIAL_MAP = {
    // Direct mappings for single API key credentials
    AAI_DEFAULT_OPENAI_API_KEY: {
        name: 'openai-default',
        credentialName: 'openAIApi',
        mapFn: (value) => ({ openAIApiKey: value })
    },
    AAI_DEFAULT_ANTHROPHIC: {
        name: 'anthropic-default',
        credentialName: 'anthropicApi',
        mapFn: (value) => ({ anthropicApiKey: value })
    },
    AAI_DEFAULT_GROQ: {
        name: 'groq-default',
        credentialName: 'groqApi',
        mapFn: (value) => ({ groqApiKey: value })
    },
    AAI_DEFAULT_DEEPSEEK: {
        name: 'deepseek-default',
        credentialName: 'deepseekApi',
        mapFn: (value) => ({ deepseekApiKey: value })
    },
    AAI_DEFAULT_EXASEARCH: {
        name: 'exasearch-default',
        credentialName: 'exaSearchApi',
        mapFn: (value) => ({ exaSearchApiKey: value })
    },
    AAI_DEFAULT_REPLICATE: {
        name: 'replicate-default',
        credentialName: 'replicateApi',
        mapFn: (value) => ({ replicateApiKey: value })
    },
    AAI_DEFAULT_SERPAPI: {
        name: 'serpapi-default',
        credentialName: 'serpApi',
        mapFn: (value) => ({ serpApiKey: value })
    },
    AAI_DEFAULT_PINCONE: {
        name: 'pinecone-default',
        credentialName: 'pineconeApi',
        mapFn: (value) => ({ pineconeApiKey: value })
    },
    AAI_DEFAULT_GITHUB_TOKEN: {
        name: 'github-default',
        credentialName: 'githubApi',
        mapFn: (value) => ({ accessToken: value })
    },

    // Group mappings for multi-field credentials
    AAI_DEFAULT_AWS_BEDROCK: {
        name: 'aws-bedrock-default',
        credentialName: 'awsApi',
        requiredVars: ['ACCESS_KEY', 'SECRET_KEY'],
        mapFn: (vars) => ({
            awsKey: vars['ACCESS_KEY'],
            awsSecret: vars['SECRET_KEY'],
            awsSession: vars['SESSION_TOKEN'] // Optional
        })
    },
    AAI_DEFAULT_SUPABASE: {
        name: 'supabase-default',
        credentialName: 'supabaseApi',
        requiredVars: ['URL', 'API'],
        mapFn: (vars) => ({
            supabaseApiKey: vars['API'],
            supabaseUrl: vars['URL'] // Assuming URL is used for auth
        })
    },
    AAI_DEFAULT_GOOGLE_SEARCH_API: {
        name: 'google-search-default',
        credentialName: 'googleCustomSearchApi',
        requiredVars: ['ENGINE_ID'],
        mapFn: (vars, apiKey) => ({
            googleCustomSearchApiKey: apiKey,
            googleCustomSearchApiId: vars['ENGINE_ID']
        })
    },
    AAI_DEFAULT_REDIS: {
        name: 'redis-default',
        credentialName: 'redisCacheApi',
        optionalVars: ['HOST', 'PORT', 'USERNAME', 'PASSWORD'],
        mapFn: (vars) => ({
            redisCacheHost: vars['HOST'] || 'localhost',
            redisCachePort: vars['PORT'] || '6379',
            redisCacheUser: vars['USERNAME'] || 'default',
            redisCachePwd: vars['PASSWORD'] || ''
        })
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

async function createDataSource() {
    // Database configuration from .env
    const dbType = process.env.DATABASE_TYPE || 'postgres'
    const dbHost = process.env.DATABASE_HOST || 'localhost'
    const dbPort = Number.parseInt(process.env.DATABASE_PORT || '5432', 10)
    const dbUser = process.env.DATABASE_USER || 'postgres'
    const dbPassword = process.env.DATABASE_PASSWORD || 'postgres'
    const dbName = 'example_db'

    console.log(`Connecting to ${dbType} database at ${dbHost}:${dbPort}/${dbName}`)

    const dataSource = new DataSource({
        type: dbType,
        host: dbHost,
        port: dbPort,
        username: dbUser,
        password: dbPassword,
        database: dbName,
        synchronize: false
    })

    await dataSource.initialize()
    console.log('Database connection initialized')
    return dataSource
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

    // Find unmapped variables
    Object.keys(defaultVars).forEach((key) => {
        if (!mappedKeys.has(key)) {
            // Try to guess credential type from key name
            const parts = key.replace('AAI_DEFAULT_', '').split('_')
            const apiName = parts[0].toLowerCase()

            // Attempt to find matching credential file
            try {
                const credentialFiles = fs.readdirSync(path.resolve(__dirname, '../components/credentials'))
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

                    unmappedCredentials.push({
                        name: `${apiName}-default`,
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
    })

    return unmappedCredentials
}

async function seedCredentials() {
    console.log('Starting auto credential seeding process...')

    let dataSource

    try {
        // Initialize database connection
        dataSource = await createDataSource()

        // Get user ID and org ID (ensuring they're either valid UUIDs or null)
        let userId = process.env.USER_ID
        let orgId = process.env.ORG_ID

        // Make sure the ID values are valid UUIDs or null
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

        // Set to null if not a valid UUID
        if (!userId || !uuidRegex.test(userId)) {
            console.log('USER_ID is not a valid UUID, setting to null')
            userId = null
        }

        if (!orgId || !uuidRegex.test(orgId)) {
            console.log('ORG_ID is not a valid UUID, setting to null')
            orgId = null
        }

        console.log(`Using User ID: ${userId || '(not set - will be null)'}`)
        console.log(`Using Organization ID: ${orgId || '(not set - will be null)'}`)

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
                // Check if credential already exists using raw SQL
                const existingCredentialSql = `
                    SELECT id FROM credential WHERE name = $1 LIMIT 1
                `
                const existingCredentials = await dataSource.query(existingCredentialSql, [credential.name])

                if (existingCredentials.length > 0) {
                    const existingId = existingCredentials[0].id
                    console.log(`Credential '${credential.name}' already exists with ID: ${existingId}`)

                    // Delete the existing credential before recreating it
                    console.log(`Deleting existing credential to recreate it...`)
                    const deleteQuery = `DELETE FROM credential WHERE id = $1`
                    await dataSource.query(deleteQuery, [existingId])
                    console.log(`Deleted credential with ID: ${existingId}`)
                }

                // Encrypt the credential data
                const encryptedData = encryptCredentialData(credential.plainDataObj)

                // Create the credential using raw SQL
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

                const insertValues = [credential.name, credential.credentialName, encryptedData, userId || null, orgId || null, 'Private']

                const result = await dataSource.query(insertSql, insertValues)
                const createdId = result[0].id

                console.log(`Created credential for ${credential.name} with ID: ${createdId}`)
                results.created.push({
                    name: credential.name,
                    id: createdId,
                    autoDetected: credential.autoDetected
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
        console.log(`Created: ${results.created.length}`)
        console.log(`Failed: ${results.failed.length}`)

        if (results.created.length > 0) {
            console.log('\nNewly created credentials:')

            // First show manually mapped credentials
            const manualCreds = results.created.filter((cred) => !cred.autoDetected)
            if (manualCreds.length > 0) {
                console.log('\n  Mapped credentials:')
                for (const cred of manualCreds) {
                    console.log(`  - ${cred.name}: ${cred.id}`)
                }
            }

            // Then show auto-detected credentials
            const autoCreds = results.created.filter((cred) => cred.autoDetected)
            if (autoCreds.length > 0) {
                console.log('\n  Auto-detected credentials:')
                for (const cred of autoCreds) {
                    console.log(`  - ${cred.name}: ${cred.id}`)
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
    seedCredentials()
        .then(() => {
            console.log('Auto credential seeding completed')
        })
        .catch((error) => {
            console.error('Unhandled error during credential seeding:', error)
            process.exit(1)
        })
}

module.exports = {
    seedCredentials
}
