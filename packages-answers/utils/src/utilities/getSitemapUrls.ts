import Sitemapper from 'sitemapper'

const getSitemapUrls = async (url: string): Promise<string[]> => {
    let sitemapUrls
    try {
        const SitemapUrls = new Sitemapper({
            url,
            timeout: 10000 // 15 seconds
        })

        const response = await SitemapUrls.fetch()
        sitemapUrls = response?.sites ?? []
    } catch (error) {
        console.log(error, url)
    }

    return sitemapUrls ?? []
}

export default getSitemapUrls
