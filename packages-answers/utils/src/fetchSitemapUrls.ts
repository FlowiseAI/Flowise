import axios from 'axios'
import cheerio from 'cheerio'

export async function fetchSitemapUrls(domain: string): Promise<string[]> {
    const urls: string[] = []

    try {
        const robotsTxtUrl = `${domain}/robots.txt`
        const robotsTxtResponse = await axios.get(robotsTxtUrl)
        const sitemapUrls = parseSitemapUrlsFromRobotsTxt(robotsTxtResponse.data)

        for (const sitemapUrl of sitemapUrls) {
            const sitemapXml = await axios.get(sitemapUrl)
            const sitemapUrls = parseSitemapUrls(sitemapXml.data)
            urls.push(...sitemapUrls)
        }
    } catch (error: any) {
        console.error(`Error fetching sitemap URLs: ${error.message}`)
    }

    return urls
}

function parseSitemapUrlsFromRobotsTxt(robotsTxtContent: string): string[] {
    const lines = robotsTxtContent.split('\n')
    const sitemapUrls: string[] = []

    for (const line of lines) {
        const lowerCaseLine = line.toLowerCase()
        if (lowerCaseLine.startsWith('sitemap:')) {
            const sitemapPath = lowerCaseLine.replace('sitemap:', '').trim()
            sitemapUrls.push(sitemapPath)
        }
    }

    return sitemapUrls
}

function parseSitemapUrls(sitemapXml: string): string[] {
    const $ = cheerio.load(sitemapXml, {
        xmlMode: true
    })
    const urls: string[] = []

    $('url > loc').each((_index, element) => {
        urls.push($(element).text())
    })

    return urls
}
