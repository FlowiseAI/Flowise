const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const openApiDir = path.join(__dirname, 'openapi')
const files = fs.readdirSync(openApiDir).filter((file) => file.endsWith('.yaml'))

for (const file of files) {
    const filePath = path.join(openApiDir, file)
    const content = fs.readFileSync(filePath, 'utf8')

    try {
        const doc = yaml.load(content)

        // Add localhost server if not already present
        if (doc.servers) {
            const localhostServer = {
                url: 'http://localhost:4000/api/v1',
                description: 'Local development server'
            }

            // Check if localhost server already exists
            const localhostExists = doc.servers.some((server) => server.url === localhostServer.url)

            if (!localhostExists) {
                doc.servers.push(localhostServer)
            }
        }

        // Update security schemes
        if (!doc.components) {
            doc.components = {}
        }

        if (!doc.components.securitySchemes) {
            doc.components.securitySchemes = {}
        }

        // Set Bearer token authentication
        doc.components.securitySchemes = {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'API key authentication with fixed value 491Rh82mgUUiC3nvVu7iwLOw79xBlW6a-Ff1xKAUQsY'
            }
        }

        // Update all security references from apiKey to bearerAuth
        const updateSecurity = (obj) => {
            if (!obj) return

            if (obj.security) {
                obj.security = obj.security.map((sec) => {
                    if (sec.apiKey !== undefined) {
                        return { bearerAuth: [] }
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

        // Write the updated YAML back to the file
        const updatedYaml = yaml.dump(doc, { lineWidth: -1 })
        fs.writeFileSync(filePath, updatedYaml, 'utf8')
        console.log(`Updated ${file}`)
    } catch (e) {
        console.error(`Error processing ${file}:`, e)
    }
}

console.log('All OpenAPI files have been updated.')
