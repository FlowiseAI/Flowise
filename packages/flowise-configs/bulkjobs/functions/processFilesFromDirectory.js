const readFilesRecursively = async (dir, fileList = []) => {
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

const processFilesFromDirectory = async (directoryPath) => {
    const files = await readFilesRecursively(directoryPath)
    for (const file of files) {
        await createContentfulEntry(file)
    }
}

module.exports = processFilesFromDirectory
