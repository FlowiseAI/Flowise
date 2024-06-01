const getFilenameFromPath = (urlOrPath: string): string | null => {
    // Use a regular expression to match the filename at the end of the path
    const regex = /\/([^\/]+)$|\\([^\\]+)$/
    const match = urlOrPath.match(regex)

    // Extract the filename if a match is found
    const filename = match ? match[1] || match[2] : null

    // Check if the extracted filename contains a dot, indicating an extension
    if (filename && filename.includes('.')) {
        return filename
    }

    return null // Return null if no filename with an extension is found
}

export default getFilenameFromPath
