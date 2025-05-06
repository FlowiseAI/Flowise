/**
 * Authentication Method Switch Script
 *
 * This script switches the authentication method in all OpenAPI YAML files
 * between Bearer token and API key authentication.
 *
 * Usage: node switch-auth-method.js [bearer|apikey]
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

// Get the authentication method from command line arguments
const args = process.argv.slice(2)
const authMethod = args[0]?.toLowerCase()

if (!authMethod || (authMethod !== 'bearer' && authMethod !== 'apikey')) {
    console.error('Please specify an authentication method: bearer or apikey')
    console.error('Usage: node switch-auth-method.js [bearer|apikey]')
    process.exit(1)
}

const API_KEY_VALUE = '491Rh82mgUUiC3nvVu7iwLOw79xBlW6a-Ff1xKAUQsY'
const openApiDir = path.join(__dirname, '..', 'openapi')
const files = fs.readdirSync(openApiDir).filter((file) => file.endsWith('.yaml'))

for (const file of files) {
    const filePath = path.join(openApiDir, file)
    const content = fs.readFileSync(filePath, 'utf8')

    try {
        const doc = yaml.load(content)

        // Update security schemes
        if (!doc.components) {
            doc.components = {}
        }

        if (!doc.components.securitySchemes) {
            doc.components.securitySchemes = {}
        }

        // Set authentication method based on command line argument
        if (authMethod === 'bearer') {
            // Set Bearer token authentication
            doc.components.securitySchemes = {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: `API key authentication with fixed value ${API_KEY_VALUE}`
                }
            }

            // Update all security references to use bearerAuth
            updateSecurityReferences(doc, 'apiKey', 'bearerAuth')
        } else {
            // Set API key authentication
            doc.components.securitySchemes = {
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: `API key authentication with fixed value ${API_KEY_VALUE}`
                }
            }

            // Update all security references to use apiKey
            updateSecurityReferences(doc, 'bearerAuth', 'apiKey')
        }

        // Write the updated YAML back to the file
        const updatedYaml = yaml.dump(doc, { lineWidth: -1 })
        fs.writeFileSync(filePath, updatedYaml, 'utf8')
        console.log(`Updated ${file}`)
    } catch (e) {
        console.error(`Error processing ${file}:`, e)
    }
}

console.log(`All OpenAPI files have been updated to use ${authMethod} authentication.`)

/**
 * Updates all security references from one method to another
 * @param {Object} doc - The OpenAPI document
 * @param {string} fromMethod - The method to replace
 * @param {string} toMethod - The method to use
 */
function updateSecurityReferences(doc, fromMethod, toMethod) {
    const updateSecurity = (obj) => {
        if (!obj) return

        if (obj.security) {
            obj.security = obj.security.map((sec) => {
                if (sec[fromMethod] !== undefined) {
                    return { [toMethod]: [] }
                }
                return sec
            })
        }

        // Recursively process all paths and operations
        for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                updateSecurity(obj[key])
            }
        }
    }

    // Update security in paths
    if (doc.paths) {
        updateSecurity(doc.paths)
    }
}
