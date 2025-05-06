/**
 * Add Localhost Server Script
 *
 * This script adds or updates the localhost server in all OpenAPI YAML files
 * without changing the authentication method.
 *
 * Usage: node add-localhost-server.js [port]
 * Default port: 4000
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

// Get the port from command line arguments or use default
const args = process.argv.slice(2)
const port = args[0] || '4000'

const openApiDir = path.join(__dirname, '..', 'openapi')
const files = fs.readdirSync(openApiDir).filter((file) => file.endsWith('.yaml'))

for (const file of files) {
    const filePath = path.join(openApiDir, file)
    const content = fs.readFileSync(filePath, 'utf8')

    try {
        const doc = yaml.load(content)

        // Add localhost server if not already present
        if (doc.servers) {
            const localhostServer = {
                url: `http://localhost:${port}/api/v1`,
                description: 'Local development server'
            }

            // Check if localhost server already exists
            const localhostServerIndex = doc.servers.findIndex((server) => server.url.includes('localhost'))

            if (localhostServerIndex === -1) {
                // Add new localhost server
                doc.servers.push(localhostServer)
                console.log(`Added localhost server to ${file}`)
            } else {
                // Update existing localhost server
                doc.servers[localhostServerIndex] = localhostServer
                console.log(`Updated localhost server in ${file}`)
            }
        } else {
            // Create servers array with localhost server
            doc.servers = [
                {
                    url: `http://localhost:${port}/api/v1`,
                    description: 'Local development server'
                }
            ]
            console.log(`Created servers array with localhost server in ${file}`)
        }

        // Write the updated YAML back to the file
        const updatedYaml = yaml.dump(doc, { lineWidth: -1 })
        fs.writeFileSync(filePath, updatedYaml, 'utf8')
    } catch (e) {
        console.error(`Error processing ${file}:`, e)
    }
}

console.log(`All OpenAPI files have been updated with localhost server on port ${port}.`)
