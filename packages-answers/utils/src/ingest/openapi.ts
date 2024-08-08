import axios from 'axios'
import { URL } from 'url'
import { inngest } from './client'
import { openApiLoader } from '../openapi'
import { EventVersionHandler } from './EventVersionHandler'
import chunkArray from '../utilities/chunkArray'
import { OpenApiProvider } from 'types'
import openApiToMarkdown from '../utilities/openApiToMarkdown'

const PINECONE_VECTORS_BATCH_SIZE = 100

interface GuruListOptions {
    domain?: string
    format?: string
    version?: string
}

const isDomainMatch = (url1: string | undefined, url2: string | undefined): boolean => {
    if (!url1 || !url2) return false

    let hostname1 = url1.toLowerCase()
    let hostname2 = url2.toLowerCase()

    // Add a protocol if none exists
    if (!/^https?:\/\//i.test(hostname1)) {
        hostname1 = `http://${hostname1}`
    }

    if (!/^https?:\/\//i.test(hostname2)) {
        hostname2 = `http://${hostname2}`
    }

    const urlObj1 = new URL(hostname1)
    const urlObj2 = new URL(hostname2)

    return urlObj1.hostname === urlObj2.hostname
}

const getXOriginUrls = (json: OpenApiProvider, options: GuruListOptions = {}): string[] => {
    const { domain = '', version = 0, format = '' } = options || {}

    return Object.entries(json).flatMap(
        ([_, { versions }]: [string, { versions: Record<string, { info: OpenApiProvider['versions'][string]['info'] }> }]) =>
            Object.values(versions).flatMap(({ info }: { info: OpenApiProvider['versions'][string]['info'] }) =>
                info && info['x-origin'] && (isDomainMatch(info['x-providerName'], domain) || isDomainMatch(info?.contact?.url, domain))
                    ? info['x-origin']
                          .filter(
                              ({ format: originFormat, version: originVersion }) =>
                                  (!format || originFormat === format) && parseFloat(originVersion!) >= parseFloat(version.toString())
                          )
                          .map(({ url }: { url?: string }) => url!)
                    : []
            )
    )
}

export const processOpenApiGuruList: EventVersionHandler<{ format?: string[]; version?: string }> = {
    event: 'openapi/guru.sync',
    v: '1',
    handler: async ({ event }) => {
        const { data } = await axios
            .get('https://api.apis.guru/v2/list.json', {
                method: 'GET',
                headers: { Accept: 'application/json' }
            })
            .catch((err) => {
                console.log(`Fetch Guru List Error: ${err}`)
                throw err
            })

        const urls = getXOriginUrls(data)

        await inngest.send({
            v: event.v,
            ts: new Date().valueOf(),
            name: 'openapi/spec.sync',
            data: {
                urls
            },
            user: event.user
        })
    }
}

const prefixHeaders = (markdown: string): string => {
    const lines = markdown.split('\n')
    let headerStack: string[] = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.startsWith('#')) {
            const header = line.replace(/^#+\s*/, '')
            const levelMatch = line.match(/^#+/)
            const level = levelMatch ? levelMatch[0].length : 0
            if (level <= headerStack.length) {
                headerStack = headerStack.slice(0, level - 1)
            }
            headerStack.push(header)
            lines[i] = `##### ${headerStack.join(' - ')}`
        }
    }
    return lines.join('\n')
}

export const processOpenApiDomainList: EventVersionHandler<{
    format?: string
    version?: string
    urls: string[]
}> = {
    event: 'openapi/domain.sync',
    v: '1',
    handler: async ({ event }) => {
        const { urls, format = 'openapi', version = '3.0' } = event.data

        const { data } = await axios
            .get('https://api.apis.guru/v2/list.json', {
                method: 'GET',
                headers: { Accept: 'application/json' }
            })
            .catch((err) => {
                console.log(`Fetch Guru List Error: ${err}`)
                throw err
            })

        urls.map(async (domain: string) => {
            const options: GuruListOptions = {
                domain,
                format,
                version
            }

            const urls = getXOriginUrls(data, options)

            await inngest.send({
                v: event.v,
                ts: new Date().valueOf(),
                name: 'openapi/spec.sync',
                data: {
                    urls
                },
                user: event.user
            })
        })
    }
}

export const processOpenApiUrl: EventVersionHandler<{ urls: string[] }> = {
    event: 'openapi/spec.sync',
    v: '1',
    handler: async ({ event }) => {
        const data = event.data
        const { urls } = data
        const openApiJsons = (await openApiLoader.loadMany(urls)) as any[] //OpenAPIV3_1.Document;

        const vectors = await Promise.all(
            openApiJsons.flatMap(async (openApiJson: any) => {
                const openApiSpec = openApiJson as any

                const originalMarkdown = await openApiToMarkdown(openApiSpec)
                const markdown = prefixHeaders(originalMarkdown)

                const headingsRegex = /^#####\s+(.*)$/gm
                const headingsArray = Array.from(markdown.matchAll(headingsRegex))

                return headingsArray.map((heading, i, arr) => {
                    const nextHeadingIndex = arr[i + 1] ? arr[i + 1].index : markdown.length
                    const content = markdown.slice((heading?.index || 0) + heading[0].length, nextHeadingIndex)

                    return {
                        uid: `OpenApi_${heading[1]
                            .replace(/[^a-zA-Z]+/g, '_')
                            .replace(/_{2,}/g, '_')
                            .toLowerCase()}`,
                        text: `${heading[0]}${content}`,
                        metadata: {
                            source: 'openapi',
                            title: openApiSpec.info.title,
                            version: openApiSpec.info.version
                        }
                    }
                })
            })
        )

        if (vectors?.length) {
            await Promise.all(
                chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map((batchVectors, i) => {
                    inngest.send({
                        v: '1',
                        ts: new Date().valueOf(),
                        name: 'pinecone/vectors.upserted',
                        data: {
                            _page: i,
                            _total: vectors.length,
                            _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                            vectors: batchVectors
                        },
                        user: event.user
                    })
                })
            )
        }
    }
}
