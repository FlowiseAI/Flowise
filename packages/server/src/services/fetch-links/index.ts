import { webCrawl, xmlScrape } from 'flowise-components'

const getAllLinks = async (requestUrl: string, relativeLinksMethod: string, queryLimit: string): Promise<any> => {
    try {
        const url = decodeURIComponent(requestUrl)
        if (!relativeLinksMethod) {
            return {
                executionError: true,
                status: 500,
                msg: `Please choose a Relative Links Method in Additional Parameters!`
            }
        }
        const limit = parseInt(queryLimit)
        if (process.env.DEBUG === 'true') console.info(`Start ${relativeLinksMethod}`)
        const links: string[] = relativeLinksMethod === 'webCrawl' ? await webCrawl(url, limit) : await xmlScrape(url, limit)
        if (process.env.DEBUG === 'true') console.info(`Finish ${relativeLinksMethod}`)
        const dbResponse = {
            status: 'OK',
            links
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: fetchLinksService.getAllLinks - ${error}`)
    }
}

export default {
    getAllLinks
}
