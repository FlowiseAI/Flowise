#!/usr/bin/env node

/**
 * Script to generate OpenAPI documentation
 */

const { execSync } = require('node:child_process')

console.log('Generating OpenAPI documentation...')

try {
    // Clean existing API docs
    console.log('Cleaning existing API docs...')
    execSync('npx docusaurus clean-api-docs all', { stdio: 'inherit' })

    // Generate API docs
    console.log('Generating new API docs...')
    execSync('npx docusaurus gen-api-docs all', { stdio: 'inherit' })

    // Generate full OpenAPI spec
    console.log('Generating full OpenAPI spec...')
    execSync('node devscripts/generate-full-openapi.js', { stdio: 'inherit' })

    console.log('API documentation generated successfully!')
} catch (error) {
    console.error('Error generating API documentation:', error.message)
    process.exit(1)
}
