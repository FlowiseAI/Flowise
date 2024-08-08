// TODO: This is pretty greedy in removing anything after the path.
// Update once decision is made on how to handle querystrings and hashes

// Function to check if a URL is valid
export const isUrlValid = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch (error) {
        return false
    }
}

export const getUniqueUrl = (url: string) => {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.replace(/^www\./i, '')
    const path = parsedUrl.pathname.replace(/\/+$/, '') // remove trailing slashes
    return `https://${hostname}${path.replace(/\/+/g, '/')}`
}

export const getUniqueUrls = (urls: string[]) => Array.from(new Set(urls.map((url) => getUniqueUrl(url))))
