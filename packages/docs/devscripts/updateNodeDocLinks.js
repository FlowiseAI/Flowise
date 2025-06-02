const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Configuration
const csvPath = path.join(__dirname, 'node_doc_mapping_cleaned.csv')
const workspaceRoot = '/Users/bradtaylor/Github/theanswer'
const baseRepoUrl = 'https://github.com/AnswerDotAI/answer/tree/main'

// Helper function to parse CSV lines
function parseCSVLine(line) {
    const parts = line.split(',')
    if (parts.length < 3) return null

    // Extract node path and doc path (removing quotes)
    const nodePath = parts[0].replace(/^"|"$/g, '')
    const docPath = parts[1].replace(/^"|"$/g, '')
    const status = parts.slice(2).join(',').replace(/^"|"$/g, '')

    return { nodePath, docPath, status }
}

// Convert a local doc path to a GitHub URL
function getGitHubDocsUrl(docPath) {
    // If it's an absolute path, make it relative to the workspace root
    let relativePath = docPath
    if (docPath.startsWith('/') || docPath.startsWith('Users/')) {
        relativePath = path.relative(workspaceRoot, docPath.replace('Users/bradtaylor/Github/theanswer/', ''))
    }

    return `${baseRepoUrl}/${relativePath}`
}

// Update a node file with the correct documentation URL
async function updateNodeFile(nodePath, docPath, status) {
    // Skip missing documentation
    if (status.includes('Missing Documentation')) {
        return { status: 'skipped', message: 'Missing documentation' }
    }

    // Get the full node path
    const fullNodePath = path.join(workspaceRoot, nodePath)

    try {
        // Read the file content
        const content = fs.readFileSync(fullNodePath, 'utf8')

        // Look for existing documentation URL patterns
        const flowiseUrlPattern = /this\.documentationUrl\s*=\s*['"](https?:\/\/flowiseai\.com\/docs\/[^'"]+)['"]/
        const githubUrlPattern = /this\.documentationUrl\s*=\s*['"](https?:\/\/github\.com\/[^'"]+)['"]/
        const anyUrlPattern = /this\.documentationUrl\s*=\s*['"]([^'"]+)['"]/

        // Generate the new documentation URL
        const docUrl = getGitHubDocsUrl(docPath)

        // Check if the file already has the correct URL
        if (content.includes(`this.documentationUrl = '${docUrl}'`)) {
            return { status: 'unchanged', message: 'URL already correct' }
        }

        let updatedContent
        let updateType

        // Replace existing URL or add new one
        if (anyUrlPattern.test(content)) {
            // Replace existing URL
            updatedContent = content.replace(anyUrlPattern, `this.documentationUrl = '${docUrl}'`)
            updateType = 'replaced'
        } else {
            // Try to find the constructor to add the URL
            const constructorPattern = /constructor\s*\([^)]*\)\s*{/
            if (constructorPattern.test(content)) {
                updatedContent = content.replace(constructorPattern, `$&\n        this.documentationUrl = '${docUrl}';`)
                updateType = 'added'
            } else {
                return {
                    status: 'error',
                    message: 'Could not find constructor to add documentation URL'
                }
            }
        }

        // Write the updated content
        fs.writeFileSync(fullNodePath, updatedContent, 'utf8')
        return {
            status: 'updated',
            message: `Documentation URL ${updateType}`,
            url: docUrl
        }
    } catch (error) {
        return {
            status: 'error',
            message: error.message
        }
    }
}

// Main function to process the CSV and update node files
async function main() {
    console.log('Updating documentation links in node files...')

    // Open the CSV file
    const fileStream = fs.createReadStream(csvPath)
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })

    // Skip the header line
    let isFirstLine = true

    // Counters
    let totalNodes = 0
    let updatedNodes = 0
    let skippedNodes = 0
    let errorNodes = 0

    // Process each line
    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false
            continue
        }

        if (!line.trim()) continue

        const parsedLine = parseCSVLine(line)
        if (!parsedLine) continue

        totalNodes++

        // Update the node file
        const result = await updateNodeFile(parsedLine.nodePath, parsedLine.docPath, parsedLine.status)

        // Log the result
        console.log(`[${result.status.toUpperCase()}] ${parsedLine.nodePath}: ${result.message}`)

        // Update counters
        if (result.status === 'updated') updatedNodes++
        else if (result.status === 'skipped') skippedNodes++
        else if (result.status === 'error') errorNodes++
    }

    // Print summary
    console.log('\nSummary:')
    console.log(`- Total nodes processed: ${totalNodes}`)
    console.log(`- Nodes updated: ${updatedNodes}`)
    console.log(`- Nodes skipped: ${skippedNodes}`)
    console.log(`- Errors: ${errorNodes}`)
}

// Run the script
main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
