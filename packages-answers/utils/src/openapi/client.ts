import axios, { ResponseType } from 'axios'
import { redis } from '../redis/client'

const blobToString = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer()
    const decoder = new TextDecoder()
    return decoder.decode(buffer)
}

class OpenApiClient {
    responseType: ResponseType
    headers: { Authorization?: string; Accept?: string; Cookie?: string }
    cacheExpireTime: number
    constructor({ cacheExpireTime = 60 * 60 * 24 } = {}) {
        this.cacheExpireTime = cacheExpireTime
        this.headers = {
            Accept: 'application/json'
        }
        this.responseType = 'json'
    }

    async fetchOpenApiData(url: string, { cache = true }: { cache?: boolean } = {}) {
        let data
        // Add cache around this call to OpenApi
        //TODO remove custom implementation when issue is fixed: https://github.com/RasCarlito/axios-cache-adapter/issues/272
        const hashKey = 'v4-get-' + url
        if (cache) {
            try {
                const cachedData = await redis.get(hashKey)

                if (cachedData) {
                    data = JSON.parse(cachedData)
                }
            } catch (err) {
                console.warn('NO REDIS CONNECTION, SKIPPING CACHE LOOKUP')
                console.log(err)
            }
        }

        if (!data) {
            try {
                let contentType: string
                if (url.endsWith('.json')) {
                    contentType = 'json'
                    this.responseType = 'json'
                    this.headers.Accept = 'application/json'
                } else if (url.endsWith('.yaml')) {
                    contentType = 'yaml'
                    this.responseType = 'text'
                    this.headers.Accept = 'application/x-yaml'
                } else if (url.startsWith('blob')) {
                    contentType = 'blob'
                    this.responseType = 'blob'
                    this.headers = {}
                } else {
                    contentType = 'text'
                    this.responseType = 'text'
                    this.headers.Accept = 'text/plain'
                }

                const response = await axios.get(url, {
                    responseType: this.responseType
                    // headers: this.headers
                })

                if (response.status !== 200) {
                    throw new Error(`Failed to fetch data from ${url}. Status: ${response.status}`)
                }

                // TODO: Add handler for HTTP requests
                data = response?.data

                if (contentType === 'blob') {
                    data = await blobToString(data)
                }

                if (cache) {
                    await redis.set(hashKey, JSON.stringify(data))
                    await redis.expire(hashKey, this.cacheExpireTime)
                }
            } catch (err) {
                console.error(`Error fetching data from ${url}`, err)
                data = false
            }
        }

        return data
    }
}

export default OpenApiClient
