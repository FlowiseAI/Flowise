import axios, { AxiosResponse } from 'axios'

import { ConfluencePage, ConfluenceSpace } from 'types'
import redisLoader from '../redisLoader'
import { redis } from '../redis/client'

interface RequestOptions {
    cache?: boolean
}

class ConfluenceClient {
    accessToken?: string
    cloudId: Promise<string>
    headers: { Authorization: string; Accept: string }
    cacheExpireTime: number
    pagesLoader = redisLoader<string, ConfluencePage>({
        keyPrefix: 'confluence:page',
        redisConfig: process.env.REDIS_URL as string,
        getValuesFn: async () => this.getConfluencePages(),
        cacheExpirationInSeconds: 0,
        disableCache: true
    })
    pageLoader = redisLoader<string, ConfluencePage>({
        keyPrefix: 'confluence:page',
        redisConfig: process.env.REDIS_URL as string,
        getValuesFn: async (keys) => {
            const results: ConfluencePage[] = []
            for (const pageId of keys) {
                const result = await this.getConfluencePage({ pageId })
                results.push(result)
            }
            return Promise.all(results)
        },
        cacheExpirationInSeconds: 0,
        disableCache: true
    })

    constructor({ cacheExpireTime = 60 * 60 * 24, accessToken }: { cacheExpireTime?: number; accessToken?: string } = {}) {
        this.cacheExpireTime = cacheExpireTime

        this.accessToken = accessToken
        this.headers = {
            Authorization: accessToken ? `Bearer ${accessToken}` : '',
            Accept: 'application/json'
        }

        this.cloudId = this.getCloudId().catch((err) => console.log(err))
    }

    async handleRateLimit(response: AxiosResponse) {
        const retryAfter = Number(response.headers['retry-after']) || 30
        console.log(`Rate limited, waiting for ${retryAfter} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
    }

    async getAppData() {
        const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
            headers: this.headers
        })

        return response.data
    }

    async getCloudId() {
        const appData = await this.getAppData()

        const confluenceData = appData.find((app: any) => app.scopes?.some((scope: string) => scope.includes('confluence')))
        return confluenceData.id
    }

    async getSpaces(): Promise<{ results: ConfluenceSpace[] }> {
        const cloudId = await this.cloudId
        const response = await axios.get(`https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/space`, {
            headers: this.headers
        })

        return response.data
    }

    async fetchConfluenceData(endpoint: string, { cache = true }: RequestOptions = {}) {
        const cloudId = await this.cloudId
        const url = `https://api.atlassian.com/ex/confluence/${cloudId}/${endpoint}`
        let data: any

        console.log('[fetchConfluenceData] URL', url)
        if (cache) {
            try {
                const cachedData = await redis.get(url)

                if (cachedData) {
                    data = JSON.parse(cachedData)
                }
            } catch (err) {
                console.warn('NO REDIS CONNECTION, SKIPPING CACHE LOOKUP')
                console.error(err)
            }
        }

        if (!data) {
            const response = await axios.get(url, {
                headers: this.headers
            })

            if (response.status === 429) {
                await this.handleRateLimit(response)
                return null
            }

            data = response.data

            if (cache) {
                await redis.set(url, JSON.stringify(data))
                await redis.expire(url, this.cacheExpireTime)
            }
        }

        return data
    }
    async getConfluencePage({ pageId }: { pageId: string }) {
        console.log(`===Fetching confluence page: ${pageId}`)
        try {
            const endpoint = `wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`
            const pageData = await this.fetchConfluenceData(endpoint, { cache: false })
            if (!pageData?.body?.atlas_doc_format?.value) throw new Error(`No valid data returned for id: ${pageId}`)

            return pageData
        } catch (error) {
            console.error('getConfluencePage:ERROR', error)
            throw error
        }
    }

    async getConfluencePages({
        limit = 250,
        cursor = ''
    }: {
        limit?: number
        cursor?: string
    } = {}) {
        console.log('===Fetching all confluence pages===')
        try {
            const endpoint = `wiki/api/v2/pages?body-format=atlas_doc_format&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
            const pagesResult: { results: any[]; _links: { next: string } } = await this.fetchConfluenceData(endpoint, { cache: false })

            const pages = pagesResult.results.filter((page) => !!page?.body?.atlas_doc_format?.value)

            if (pagesResult._links?.next) {
                const nextCursor = new URL('https://test.com' + pagesResult._links.next).searchParams.get('cursor')
                if (nextCursor) {
                    const nextPageResults = await this.getConfluencePages({
                        limit,
                        cursor: nextCursor
                    })
                    pages.push(...nextPageResults)
                }
            }

            return pages
        } catch (error) {
            console.error('getConfluencePages:ERROR', error)
            throw error
        }
    }
}

export default ConfluenceClient
