#!/usr/bin/env node
/**
 * Generate deterministic UUIDs for TheAnswer credentials and other resources
 * Usage:
 *   node scripts/generate-uuid.js credential-name
 *   node scripts/generate-uuid.js openai-default
 */

const { v5: uuidv5 } = require('uuid')

// Helper to generate deterministic UUIDs for credentials
function generateDeterministicUUID(name, namespace = 'credentials') {
    // Different namespaces for different types of resources
    const namespaces = {
        credentials: uuidv5('theanswer.ai.credentials', uuidv5.DNS),
        chatflows: uuidv5('theanswer.ai.chatflows', uuidv5.DNS),
        tools: uuidv5('theanswer.ai.tools', uuidv5.DNS),
        documents: uuidv5('theanswer.ai.documents', uuidv5.DNS),
        users: uuidv5('theanswer.ai.users', uuidv5.DNS),
        organizations: uuidv5('theanswer.ai.organizations', uuidv5.DNS)
    }

    const namespaceUuid = namespaces[namespace] || namespaces.credentials
    return uuidv5(name, namespaceUuid)
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        console.log('Usage: node generate-uuid.js <name> [namespace]')
        console.log('Available namespaces: credentials, chatflows, tools, documents, users, organizations')
        console.log('')
        console.log('Examples:')
        console.log('  node generate-uuid.js openai-default')
        console.log('  node generate-uuid.js my-chatflow chatflows')
        console.log('  node generate-uuid.js user@example.com users')
        process.exit(1)
    }

    const name = args[0]
    const namespace = args[1] || 'credentials'

    const uuid = generateDeterministicUUID(name, namespace)
    console.log(`${namespace}:${name} -> ${uuid}`)
}

module.exports = {
    generateDeterministicUUID
}
