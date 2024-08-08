const getDomainUrlsFromMarkdown = (markdownString: string, origin: string): string[] => {
    const linkPattern = /(!)?\[\s*([^\]]+?)\s*\]\s*\(\s*([^)]+?)\s*\)/g
    const imagePattern = /\.(png|jpg|jpeg|gif|bmp|svg)$/i
    const matches = Array.from(markdownString.matchAll(linkPattern))
    const filteredUrls: string[] = []

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const isImageSyntax = match[1]
        const linkText = match[2]
        const url = match[3]

        const hasImageExtension = imagePattern.test(url)

        if (url.startsWith(origin) && !isImageSyntax && !hasImageExtension) {
            filteredUrls.push(url)
        }
    }

    return filteredUrls
}

export default getDomainUrlsFromMarkdown
