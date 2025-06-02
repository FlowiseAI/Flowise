const fs = require('fs')
const path = require('path')

// Configuration
const csvPath = path.join(__dirname, 'node_doc_mapping.csv')
const outputPath = path.join(__dirname, 'node_doc_mapping_cleaned.csv')
const workspaceRoot = '/Users/bradtaylor/Github/theanswer'
const docsNodeBasePath = path.join(workspaceRoot, 'packages/docs/docs/using-answerai/sidekick-studio/nodes')

// Helper function
function toKebabCase(str) {
    if (!str) return ''
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
}

// Parse a line from the CSV
function parseCSVLine(line) {
    const parts = line.split(',')
    if (parts.length < 3) return null

    // Extract node path and doc path (removing quotes)
    const nodePath = parts[0].replace(/^"|"$/g, '')
    const docPath = parts[1].replace(/^"|"$/g, '')
    const status = parts.slice(2).join(',').replace(/^"|"$/g, '')

    return { nodePath, docPath, status }
}

// Main function
function cleanupCSV() {
    console.log('Cleaning up tool matches in CSV...')

    // Read the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n')

    // Process header and lines
    const header = lines[0]
    const dataLines = lines.slice(1)
    const cleanedLines = []

    // Add header
    cleanedLines.push(header)

    // Process each line
    dataLines.forEach((line) => {
        if (!line.trim()) {
            // Empty line
            cleanedLines.push(line)
            return
        }

        const parsedLine = parseCSVLine(line)
        if (!parsedLine) {
            // Invalid line
            cleanedLines.push(line)
            return
        }

        // Check if this is a tool node
        const isToolNode = parsedLine.nodePath.includes('/tools/')
        const isDocLoaderDoc = parsedLine.docPath.includes('/document-loaders/')
        const isGithubMd = parsedLine.docPath.includes('/document-loaders/github.md')

        if ((isToolNode && isDocLoaderDoc) || (isToolNode && isGithubMd)) {
            // This is a tool node matched to a document-loader doc
            console.log(`Fixing invalid match: ${parsedLine.nodePath}`)

            // Get node name without extension
            const nodeName = path.basename(parsedLine.nodePath, '.ts')
            const nodeDir = path.dirname(parsedLine.nodePath)
            const nodeFolder = path.basename(nodeDir)

            // Generate a sensible doc path
            let docName = nodeFolder !== nodeName && nodeFolder.length < nodeName.length ? nodeFolder : nodeName
            docName = toKebabCase(docName)

            const suggestedDocPath = `Users/bradtaylor/Github/theanswer/packages/docs/docs/using-answerai/sidekick-studio/nodes/tools/${docName}.md`

            // Replace this line with a "Missing Documentation" entry
            cleanedLines.push(`"${parsedLine.nodePath}","${suggestedDocPath}","Missing Documentation (Tool)"`)
        } else {
            // Keep this line as is
            cleanedLines.push(line)
        }
    })

    // Write out the cleaned CSV
    fs.writeFileSync(outputPath, cleanedLines.join('\n'))

    console.log(`Cleaned CSV written to: ${outputPath}`)
    console.log('Use this version for your documentation update process.')
}

// Run the cleanup
cleanupCSV()
