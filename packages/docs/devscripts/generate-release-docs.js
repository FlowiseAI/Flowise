#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

// Get version from command line argument or use default
const version = process.argv[2] || '0.42'

// Define the base paths
const docsRoot = path.join(__dirname, '..')
const releaseDir = path.join(docsRoot, 'releases', version)

// Create the release directory if it doesn't exist
if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true })
    console.log(`Created release directory: ${releaseDir}`)
}

// Define the repomix commands
const commands = [
    {
        name: 'blog-docs',
        sourceDir: path.join(docsRoot, 'blog'),
        outputFile: path.join(releaseDir, 'blog-docs.xml')
    },
    {
        name: 'marketing',
        sourceDir: path.join(docsRoot, 'src', 'pages'),
        outputFile: path.join(releaseDir, 'marketing.xml')
    },
    {
        name: 'documentation',
        sourceDir: path.join(docsRoot, 'docs'),
        outputFile: path.join(releaseDir, 'documentation.xml')
    }
]

// Execute repomix for each command
for (const { name, sourceDir, outputFile } of commands) {
    console.log(`\n🚀 Generating ${name} from ${sourceDir}...`)

    try {
        // Check if source directory exists
        if (!fs.existsSync(sourceDir)) {
            console.warn(`⚠️  Warning: Source directory ${sourceDir} does not exist, skipping ${name}`)
            continue
        }

        // Run repomix command
        const cmd = `repomix "${sourceDir}" --output "${outputFile}" --no-file-summary --style xml`

        console.log(`Running: ${cmd}`)
        execSync(cmd, { stdio: 'inherit', cwd: docsRoot })

        console.log(`✅ Successfully generated ${name} -> ${outputFile}`)
    } catch (error) {
        console.error(`❌ Error generating ${name}: ${error.message}`)
        process.exit(1)
    }
}

console.log(`\n🎉 All documentation files generated successfully for release ${version}!`)
console.log(`📁 Files created in: ${releaseDir}`)
console.log(`📋 Generated files:`)
for (const { name, outputFile } of commands) {
    if (fs.existsSync(outputFile)) {
        console.log(`   - ${name}: ${path.basename(outputFile)}`)
    }
}
