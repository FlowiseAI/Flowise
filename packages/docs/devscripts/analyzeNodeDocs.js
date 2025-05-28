// analyzeNodeDocs.js
const fs = require('fs')
const path = require('path')
const glob = require('glob') // Using glob for file matching

// --- Configuration ---
// Use absolute paths
const componentsNodeBasePath = '/Users/bradtaylor/Github/theanswer/packages/components/nodes'
const docsNodeBasePath = '/Users/bradtaylor/Github/theanswer/packages/docs/docs/using-answerai/sidekick-studio/nodes'
const workspaceRoot = '/Users/bradtaylor/Github/theanswer'

// Log for debugging
console.log('Components path:', componentsNodeBasePath)
console.log('Docs path:', docsNodeBasePath)

// --- Helper Functions ---

/**
 * Converts CamelCase or PascalCase to kebab-case.
 * @param {string} str
 * @returns {string}
 */
function toKebabCase(str) {
    if (!str) return ''
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // get all lowercase letters that are near to uppercase
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2') // get all uppercase letters that are near to uppercase followed by lowercase
        .toLowerCase()
}

/**
 * Generates a likely doc filename from a node name or group.
 * @param {string} name
 * @returns {string}
 */
function generatePossibleDocNames(name) {
    const kebab = toKebabCase(name)
    const commonSuffixes = [
        'retriever',
        'node',
        'chain',
        'memory',
        'loader',
        'store',
        'agent',
        'tool',
        'llm',
        'embedding',
        'splitter',
        'parser',
        'engine',
        'custom',
        'api'
    ]
    let baseNames = [kebab]

    // Attempt to remove common suffixes for broader matching
    for (const suffix of commonSuffixes) {
        if (kebab.endsWith(`-${suffix}`)) {
            baseNames.push(kebab.substring(0, kebab.length - suffix.length - 1))
        }
    }
    // Handle cases where the node itself is just the suffix, e.g. "Agent.ts"
    if (commonSuffixes.includes(kebab) && !baseNames.includes(kebab)) {
        baseNames.push(kebab)
    }

    // Special handling for cases like OpenAI where it might be openai.md or open-ai.md
    if (name.toLowerCase().includes('openai')) {
        baseNames.push(kebab.replace('openai', 'open-ai'))
        baseNames.push(kebab.replace('openai', 'openai')) // ensure original is there
    }
    if (name.toLowerCase().includes('api')) {
        baseNames.push(kebab.replace('-api', ''))
    }

    return [...new Set(baseNames.filter((bn) => bn))] // Unique, non-empty names
}

/**
 * Extracts relevant parts from a node file path.
 * Example: packages/components/nodes/retrievers/VoyageAIRetriever/VoyageAIRerank.ts
 * Returns: { category: 'retrievers', nodeName: 'VoyageAIRerank', nodeGroup: 'VoyageAIRetriever', fullPath: '...' }
 * Example: packages/components/nodes/tools/Calculator/Calculator.ts
 * Returns: { category: 'tools', nodeName: 'Calculator', nodeGroup: 'Calculator', fullPath: '...' }
 */
function parseNodePath(nodeFilePath) {
    const relativePath = path.relative(componentsNodeBasePath, nodeFilePath)
    const parts = relativePath.split(path.sep)
    const fileName = parts.pop() // e.g., VoyageAIRerank.ts
    const nodeName = path.basename(fileName, '.ts')

    let category = parts.shift() || '' // e.g., retrievers or tools
    let nodeGroup = parts.pop() || nodeName // The directory name or the node name if no subdirectory

    // If nodeGroup is the same as category, it means it's a direct file in category folder
    // e.g. nodes/llms/Cohere.ts -> category: llms, nodeGroup: Cohere (from filename)
    // but we want nodeGroup to be more specific if possible from path
    if (parts.length > 0 && parts[parts.length - 1] !== category) {
        nodeGroup = parts[parts.length - 1]
    } else {
        nodeGroup = nodeName // Fallback if no intermediate dir
    }

    // If category is undefined (e.g. node directly in componentsNodeBasePath), set to 'general' or handle as needed
    if (!category && nodeFilePath.includes(componentsNodeBasePath)) {
        // This case means the node is directly under componentsNodeBasePath, which is not expected by current structure
        // For now, we'll try to derive category from the first part of the node name if possible, or set to 'unknown'
        const nameParts = nodeName.match(/[A-Z][a-z]+|[A-Z]+/g)
        category = nameParts && nameParts.length > 1 ? toKebabCase(nameParts[0]) : 'unknown'
        nodeGroup = nodeName
    }

    return {
        category: toKebabCase(category),
        nodeName: nodeName,
        nodeGroup: nodeGroup, // This could be a "group" like "VoyageAIRetriever" or the nodeName itself like "Calculator"
        fullPath: nodeFilePath
    }
}

/**
 * Extracts relevant parts from a doc file path.
 * Example: packages/docs/docs/using-answerai/sidekick-studio/nodes/retrievers/voyage-ai-retriever.md
 * Returns: { category: 'retrievers', docName: 'voyage-ai-retriever', fullPath: '...' }
 */
function parseDocPath(docFilePath) {
    const relativePath = path.relative(docsNodeBasePath, docFilePath)
    const parts = relativePath.split(path.sep)
    const fileName = parts.pop() // e.g., voyage-ai-retriever.md
    const docNameWithExt = path.basename(fileName)
    const docName = docNameWithExt.replace(/\.(md|mdx)$/, '')
    const category = parts.shift() || '' // e.g., retrievers

    return {
        category: toKebabCase(category), // Already kebab from dir structure mostly
        docName: docName,
        fullPath: docFilePath
    }
}

// --- Main Logic ---
console.log('Analyzing node documentation...\n')

const nodeFiles = glob
    .sync(`${componentsNodeBasePath}/**/*.ts`, {
        cwd: workspaceRoot,
        ignore: [
            `${componentsNodeBasePath}/**/core.ts`,
            `${componentsNodeBasePath}/**/utils.ts`,
            `${componentsNodeBasePath}/**/commonUtils.ts`,
            `${componentsNodeBasePath}/**/interface.ts`,
            `${componentsNodeBasePath}/**/prompts.ts`,
            `${componentsNodeBasePath}/**/base.ts`,
            `${componentsNodeBasePath}/**/NemoClient.ts`,
            `${componentsNodeBasePath}/**/DriveService.ts`,
            `${componentsNodeBasePath}/**/GmailService.ts`,
            `${componentsNodeBasePath}/**/pgSaver.ts`,
            `${componentsNodeBasePath}/**/sqliteSaver.ts`,
            `${componentsNodeBasePath}/**/mysqlSaver.ts`,
            `${componentsNodeBasePath}/**/EngineUtils.ts`,
            `${componentsNodeBasePath}/**/OutputParserHelpers.ts`,
            `${componentsNodeBasePath}/**/VectorStoreUtils.ts`,
            `${componentsNodeBasePath}/**/driver/*.*`
        ]
    })
    .map((p) => path.join(workspaceRoot, p))
const docFiles = glob
    .sync(`${docsNodeBasePath}/**/*.{md,mdx}`, { cwd: workspaceRoot, ignore: `${docsNodeBasePath}/**/README.md` })
    .map((p) => path.join(workspaceRoot, p))

const parsedNodes = nodeFiles.map(parseNodePath)
const parsedDocs = docFiles.map(parseDocPath)

const matchedNodes = []
const missingDocForNode = []
const orphanedDocs = new Set(parsedDocs.map((d) => d.fullPath)) // Assume all docs are orphaned initially

console.log(`Found ${parsedNodes.length} node files (excluding core/utils).`)
console.log(`Found ${parsedDocs.length} documentation files (excluding READMEs).\n`)

parsedNodes.forEach((node) => {
    let foundDoc = null
    // Try to match node.nodeName first, then node.nodeGroup if different
    const possibleNodeNameDocs = generatePossibleDocNames(node.nodeName)
    const possibleNodeGroupDocs = node.nodeGroup !== node.nodeName ? generatePossibleDocNames(node.nodeGroup) : []
    const allPossibleSimpleDocNames = [...new Set([...possibleNodeNameDocs, ...possibleNodeGroupDocs])]

    for (const parsedDoc of parsedDocs) {
        // Prioritize matching category
        if (node.category === parsedDoc.category) {
            if (allPossibleSimpleDocNames.includes(parsedDoc.docName)) {
                foundDoc = parsedDoc
                break
            }
            // Attempt a more complex match: if nodeGroup contains nodeName (e.g. VoyageAIRetriever, VoyageAIRerank)
            // and docName matches nodeGroup's kebab name.
            if (node.nodeGroup.toLowerCase().includes(node.nodeName.toLowerCase()) && possibleNodeGroupDocs.includes(parsedDoc.docName)) {
                foundDoc = parsedDoc
                break
            }
        }
    }
    // Fallback: check without strict category match if desperate, but with higher similarity requirement
    if (!foundDoc) {
        for (const parsedDoc of parsedDocs) {
            if (allPossibleSimpleDocNames.includes(parsedDoc.docName)) {
                // This is a weaker match, could be logged differently if needed
                // console.warn(`Weak match for ${node.fullPath} with ${parsedDoc.fullPath} (category mismatch)`);
                foundDoc = parsedDoc
                break
            }
        }
    }

    if (foundDoc) {
        matchedNodes.push({ node, doc: foundDoc })
        orphanedDocs.delete(foundDoc.fullPath)
    } else {
        missingDocForNode.push(node)
    }
})

console.log('--- Matched Nodes ---')
if (matchedNodes.length > 0) {
    matchedNodes.forEach((match) => {
        console.log(
            `Node: ${path.relative(workspaceRoot, match.node.fullPath)} ==> Doc: ${path.relative(workspaceRoot, match.doc.fullPath)}`
        )
    })
} else {
    console.log('No nodes found with direct documentation matches.')
}

console.log('\n--- Nodes Missing Documentation (Needs Creation/Update) ---')
if (missingDocForNode.length > 0) {
    missingDocForNode.forEach((nodeInfo) => {
        const expectedDocDir = path.join(docsNodeBasePath, nodeInfo.category)
        const typicalDocName = `${toKebabCase(
            nodeInfo.nodeGroup !== nodeInfo.nodeName && nodeInfo.nodeName.length < nodeInfo.nodeGroup.length
                ? nodeInfo.nodeGroup
                : nodeInfo.nodeName
        )}.md`
        console.log(
            `Node: ${path.relative(workspaceRoot, nodeInfo.fullPath)} (Suggested Doc: ${path.join(
                path.relative(workspaceRoot, expectedDocDir),
                typicalDocName
            )})`
        )
    })
} else {
    console.log('All nodes appear to have corresponding documentation (based on current matching logic).')
}

console.log('\n--- Orphaned/Potentially Misplaced Documentation (Review Needed) ---')
if (orphanedDocs.size > 0) {
    orphanedDocs.forEach((docPath) => {
        console.log(`Doc: ${path.relative(workspaceRoot, docPath)}`)
    })
} else {
    console.log('No orphaned documentation files found.')
}

console.log(`\n\nSummary:`)
console.log(`- Matched Nodes: ${matchedNodes.length}`)
console.log(`- Nodes Missing Docs: ${missingDocForNode.length}`)
console.log(`- Orphaned Docs: ${orphanedDocs.size}`)

// Further tasks:
// 1. Script to create markdown stubs for missing docs.
// 2. Script to update doc links in node constructors.
