#!/usr/bin/env node

/**
 * Script to combine all OpenAPI specs into a single file
 */

const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')

// Path to the OpenAPI directory
const openApiDir = path.join(__dirname, '..', 'openapi')
// Output file path
const outputPath = path.join(__dirname, '..', 'static', 'api', 'full-api-spec.yaml')
const outputJsonPath = path.join(__dirname, '..', 'static', 'api', 'full-api-spec.json')

// Ensure output directory exists
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
}

// Read the document-store.yaml file to use as the base
const baseSpecPath = path.join(openApiDir, 'document-store.yaml')
const baseSpec = yaml.load(fs.readFileSync(baseSpecPath, 'utf8'))

// Initialize combined paths and components
const combinedPaths = { ...baseSpec.paths }
const combinedComponents = {
    schemas: { ...baseSpec.components.schemas },
    securitySchemes: { ...baseSpec.components.securitySchemes }
}

// Get all yaml files in the openapi directory
const yamlFiles = fs.readdirSync(openApiDir).filter((file) => file.endsWith('.yaml') && file !== 'document-store.yaml')

// Process each yaml file
for (const file of yamlFiles) {
    const filePath = path.join(openApiDir, file)
    try {
        const spec = yaml.load(fs.readFileSync(filePath, 'utf8'))

        // Merge paths
        if (spec.paths) {
            Object.assign(combinedPaths, spec.paths)
        }

        // Merge components if they exist
        if (spec.components) {
            if (spec.components.schemas) {
                Object.assign(combinedComponents.schemas, spec.components.schemas)
            }
            if (spec.components.securitySchemes) {
                Object.assign(combinedComponents.securitySchemes, spec.components.securitySchemes)
            }
        }

        console.log(`Processed: ${file}`)
    } catch (error) {
        console.error(`Error processing ${file}:`, error.message)
    }
}

// Create the combined spec
const combinedSpec = {
    ...baseSpec,
    paths: combinedPaths,
    components: combinedComponents
}

// Set up clean server URLs for RapidAPI compatibility
// RapidAPI has specific requirements for server URLs
combinedSpec.servers = [
    {
        url: 'https://{apiHost}',
        description: 'API server with variable host',
        variables: {
            apiHost: {
                default: 'api.theanswer.ai',
                description: 'The API host to be replaced with your endpoint (can be set via environment variable)'
            }
        }
    }
]

// No need for the old loop that added basePath variables
// We're now using a more RapidAPI-friendly approach with host variables

// Fix path prefixes for RapidAPI compatibility
const fixedPaths = {}
for (const path in combinedPaths) {
    // Add /api/v1 prefix to all paths if they don't already have the correct prefix
    let newPath = path
    if (!path.startsWith('/api/v1')) {
        // If it already has /v1 but not /api, just add /api
        if (path.startsWith('/v1')) {
            newPath = `/api${path}`
        } else {
            // Otherwise add the full /api/v1 prefix
            newPath = `/api/v1${path}`
        }
    }
    fixedPaths[newPath] = combinedPaths[path]
}
combinedSpec.paths = fixedPaths

// Ensure security scheme is properly defined for RapidAPI
// RapidAPI needs a clear security scheme definition to properly handle authentication
combinedComponents.securitySchemes = {
    bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your bearer token in the format "Bearer {token}"'
    },
    // Add another security definition that explicitly uses the Authorization header
    // This is often better recognized by RapidAPI
    apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Enter your bearer token in the format "Bearer {token}"'
    }
}

// Set global security requirement - include both methods for better compatibility
combinedSpec.security = [{ bearerAuth: [] }, { apiKeyAuth: [] }]

// Update security on each operation for better RapidAPI compatibility
for (const path in combinedSpec.paths) {
    for (const method in combinedSpec.paths[path]) {
        // Skip non-HTTP methods like parameters
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
            continue
        }

        const operation = combinedSpec.paths[path][method]

        // Add an x-rapidapi-auth extension to help RapidAPI recognize the auth method
        operation['x-rapidapi-auth'] = 'bearer'

        // Ensure each operation has security defined with both options
        operation.security = [{ bearerAuth: [] }, { apiKeyAuth: [] }]

        // Add a parameter for the Authorization header explicitly for better compatibility
        if (!operation.parameters) {
            operation.parameters = []
        }

        // Check if an Authorization header parameter already exists
        const hasAuthHeader = operation.parameters.some((param) => param.in === 'header' && param.name === 'Authorization')

        // Add Authorization header parameter if it doesn't exist
        if (!hasAuthHeader) {
            operation.parameters.push({
                name: 'Authorization',
                in: 'header',
                description: 'Bearer token for API authentication',
                required: true,
                schema: {
                    type: 'string',
                    example: 'Bearer {apiToken}'
                }
            })
        }
    }
}

// Update the info section
combinedSpec.info.title = 'AnswerAgentAI Complete API'
combinedSpec.info.description = 'Complete API documentation for all AnswerAgentAI services'

// Write the combined spec to yaml file
fs.writeFileSync(outputPath, yaml.dump(combinedSpec))
console.log(`Combined OpenAPI spec written to ${outputPath}`)

// Write the combined spec to json file
fs.writeFileSync(outputJsonPath, JSON.stringify(combinedSpec, null, 2))
console.log(`Combined OpenAPI spec written to ${outputJsonPath}`)
