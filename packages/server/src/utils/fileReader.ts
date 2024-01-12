export async function readFileContents(filePath: string) {
    try {
        const path = require('path')
        const absolutefilePath = path.join(__dirname, filePath)
        console.log(`Reading file from disk at ${absolutefilePath}}`)
        const fs = require('fs').promises
        const data = await fs.readFile(absolutefilePath, 'utf8')
        return data
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`)
    }
}

const key = 'value'
