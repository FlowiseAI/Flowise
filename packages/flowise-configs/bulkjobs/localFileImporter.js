const contentful = require('contentful-management')
const fs = require('fs')
const path = require('path')
const util = require('util')

const readdir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)

const MAX_CHARS = 50000

async function readFilesRecursively(dir, fileList = []) {
    const files = await readdir(dir, { withFileTypes: true })
    await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(dir, file.name)
            if (file.isDirectory()) {
                await readFilesRecursively(filePath, fileList)
            } else if (file.isFile() && path.extname(file.name) === '.txt') {
                const content = await readFile(filePath, 'utf8')
                const baseName = path.basename(file.name, '.txt')
                if (content.length > MAX_CHARS) {
                    const numParts = Math.ceil(content.length / MAX_CHARS)
                    for (let i = 0; i < numParts; i++) {
                        fileList.push({
                            name: `${baseName} - Part ${i + 1}`,
                            content: content.substring(i * MAX_CHARS, (i + 1) * MAX_CHARS)
                        })
                    }
                } else {
                    fileList.push({ name: baseName, content })
                }
            }
        })
    )
    return fileList
}

async function createContentfulEntry(file) {
    const config = {
        spaceId: process.env.CONTENTFUL_SPACE_ID,
        environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
        managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
    }

    const managementClient = contentful.createClient(
        {
            accessToken: config.managementToken
        },
        { type: 'plain' }
    )

    const fields = {
        title: { 'en-US': file.name },
        textContent: { 'en-US': file.content }
    }

    const entry = await managementClient.entry.create(
        {
            spaceId: config.spaceId,
            environmentId: config.environmentId,
            contentTypeId: 'originalDocuments' // Update this with your actual Content Type ID
        },
        { fields }
    )

    await managementClient.entry.publish(
        { spaceId: config.spaceId, environmentId: config.environmentId, entryId: entry.sys.id },
        { ...entry }
    )
}

async function processFilesFromDirectory(directoryPath) {
    const files = await readFilesRecursively(directoryPath)
    for (const file of files) {
        await createContentfulEntry(file)
    }
}

; (async () => {
    console.log('Starting local file import...')
    await processFilesFromDirectory('./') // Update this with your directory path
})()
