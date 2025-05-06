#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')
const chalk = require('chalk')

// Define paths
const SWAGGER_PATH = path.join(__dirname, '../packages/api-documentation/src/yml/swagger.yml')
const OPENAPI_DIR = path.join(__dirname, '../packages/docs/openapi')

// Function to read and parse YAML file
function readYamlFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        return yaml.load(fileContent)
    } catch (error) {
        console.error(chalk.red(`Error reading ${filePath}: ${error.message}`))
        process.exit(1)
    }
}

// Function to write YAML file
function writeYamlFile(filePath, data) {
    try {
        const yamlContent = yaml.dump(data, { lineWidth: 100 })
        fs.writeFileSync(filePath, yamlContent, 'utf8')
        return true
    } catch (error) {
        console.error(chalk.red(`Error writing ${filePath}: ${error.message}`))
        return false
    }
}

// Function to create a log of changes
function logChanges(filename, changes) {
    if (changes.length === 0) {
        console.log(chalk.green(`✅ No changes needed for ${filename}`))
        return
    }

    console.log(chalk.yellow(`📝 Changes for ${filename}:`))
    for (const change of changes) {
        console.log(`  - ${change}`)
    }
}

// Function to extract components needed for a specific API
function extractReferencedComponents(mainSwagger, individualSpec) {
    const referencedComponents = {
        schemas: {},
        securitySchemes: mainSwagger.components.securitySchemes
    }

    const extractComponentReferences = (obj) => {
        if (!obj) return

        if (typeof obj === 'object') {
            // Check if this is a reference
            if (obj.$ref && typeof obj.$ref === 'string') {
                const match = obj.$ref.match(/#\/components\/schemas\/([^/]+)$/)
                if (match && match[1]) {
                    const schemaName = match[1]
                    // Add the referenced schema to our collection
                    if (mainSwagger.components?.schemas?.[schemaName]) {
                        referencedComponents.schemas[schemaName] = mainSwagger.components.schemas[schemaName]

                        // Recursively check for nested references in this schema
                        extractComponentReferences(mainSwagger.components.schemas[schemaName])
                    }
                }
            } else {
                // Recursively process object properties
                for (const key in obj) {
                    extractComponentReferences(obj[key])
                }
            }
        } else if (Array.isArray(obj)) {
            // Recursively process array items
            for (const item of obj) {
                extractComponentReferences(item)
            }
        }
    }

    // Start with paths
    if (individualSpec.paths) {
        for (const pathItem of Object.values(individualSpec.paths)) {
            for (const operation of Object.values(pathItem)) {
                extractComponentReferences(operation)
            }
        }
    }

    return referencedComponents
}

// Function to sync a specific API file
function syncApiFile(mainSwagger, fileName) {
    const apiName = path.basename(fileName, '.yaml')
    const changes = []

    // Read the individual API file
    const filePath = path.join(OPENAPI_DIR, fileName)
    const individualSpec = readYamlFile(filePath)

    // Find relevant paths in the main swagger
    const relevantPaths = {}
    const tagName = apiName.replace(/-/g, ' ')

    for (const [pathKey, pathValue] of Object.entries(mainSwagger.paths)) {
        // Check if any operation in this path has the relevant tag
        const hasRelevantTag = Object.values(pathValue).some((operation) =>
            operation.tags?.some((tag) => tag.toLowerCase() === apiName.toLowerCase() || tag.toLowerCase() === tagName.toLowerCase())
        )

        if (hasRelevantTag) {
            relevantPaths[pathKey] = pathValue
        }
    }

    // If no paths found for this API, log and skip
    if (Object.keys(relevantPaths).length === 0) {
        console.log(chalk.yellow(`⚠️ No relevant paths found in swagger.yml for ${apiName}`))
        return changes
    }

    // Check for differences in paths
    for (const [pathKey, pathValue] of Object.entries(relevantPaths)) {
        const normalizedPathKey = pathKey.replace(/^\/api\/v1/, '')

        // Check if path exists in individual spec
        if (individualSpec.paths && individualSpec.paths[normalizedPathKey]) {
            // Compare operations
            for (const [method, operation] of Object.entries(pathValue)) {
                if (!individualSpec.paths[normalizedPathKey][method]) {
                    changes.push(`Add missing method ${method.toUpperCase()} for path ${normalizedPathKey}`)
                    individualSpec.paths[normalizedPathKey][method] = operation
                } else {
                    // Compare operation properties
                    const individualOperation = individualSpec.paths[normalizedPathKey][method]

                    // Check for differences in parameters
                    if (
                        operation.parameters &&
                        (!individualOperation.parameters ||
                            JSON.stringify(operation.parameters) !== JSON.stringify(individualOperation.parameters))
                    ) {
                        changes.push(`Update parameters for ${method.toUpperCase()} ${normalizedPathKey}`)
                        individualOperation.parameters = operation.parameters
                    }

                    // Check for differences in requestBody
                    if (
                        operation.requestBody &&
                        (!individualOperation.requestBody ||
                            JSON.stringify(operation.requestBody) !== JSON.stringify(individualOperation.requestBody))
                    ) {
                        changes.push(`Update requestBody for ${method.toUpperCase()} ${normalizedPathKey}`)
                        individualOperation.requestBody = operation.requestBody
                    }

                    // Check for differences in responses
                    if (
                        operation.responses &&
                        (!individualOperation.responses ||
                            JSON.stringify(operation.responses) !== JSON.stringify(individualOperation.responses))
                    ) {
                        changes.push(`Update responses for ${method.toUpperCase()} ${normalizedPathKey}`)
                        individualOperation.responses = operation.responses
                    }
                }
            }
        } else {
            changes.push(`Add new path ${normalizedPathKey}`)
            if (!individualSpec.paths) individualSpec.paths = {}
            individualSpec.paths[normalizedPathKey] = pathValue
        }
    }

    // Extract and update referenced components
    const referencedComponents = extractReferencedComponents(mainSwagger, individualSpec)

    // Update schemas
    if (!individualSpec.components) individualSpec.components = {}
    if (!individualSpec.components.schemas) individualSpec.components.schemas = {}

    for (const [schemaName, schema] of Object.entries(referencedComponents.schemas)) {
        if (
            !individualSpec.components.schemas[schemaName] ||
            JSON.stringify(individualSpec.components.schemas[schemaName]) !== JSON.stringify(schema)
        ) {
            changes.push(`Update schema: ${schemaName}`)
            individualSpec.components.schemas[schemaName] = schema
        }
    }

    // Update security schemes if needed
    if (
        !individualSpec.components.securitySchemes ||
        JSON.stringify(individualSpec.components.securitySchemes) !== JSON.stringify(referencedComponents.securitySchemes)
    ) {
        changes.push('Update securitySchemes')
        individualSpec.components.securitySchemes = referencedComponents.securitySchemes
    }

    // Write updated spec if there are changes
    if (changes.length > 0) {
        writeYamlFile(filePath, individualSpec)
    }

    return changes
}

// Main function
async function main() {
    console.log(chalk.blue('Starting OpenAPI documentation synchronization...'))

    // Read the main swagger file
    const mainSwagger = readYamlFile(SWAGGER_PATH)

    // Get all YAML files in the openapi directory
    const files = fs.readdirSync(OPENAPI_DIR).filter((file) => file.endsWith('.yaml') && file !== 'index.yaml')

    // Process each file
    for (const file of files) {
        const changes = syncApiFile(mainSwagger, file)
        logChanges(file, changes)
    }

    console.log(chalk.green('Synchronization complete!'))
}

// Run the script
main().catch((error) => {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
})
