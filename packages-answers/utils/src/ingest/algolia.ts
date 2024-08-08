import { inngest } from './client'
import { EventVersionHandler } from './EventVersionHandler'
import chunkArray from '../utilities/chunkArray'
import type { AlgoliaHit } from 'types'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch'

const PINECONE_VECTORS_BATCH_SIZE = 100

const { ALGOLIA_APPLICATION_ID = '', ALGOLIA_ADMIN_API_KEY = '' } = process.env

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

const recursiveCharacterTextSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 3000
})

const splitPageHtmlChunkMore = async (markdownChunk: string) => {
    const contextChunks = await recursiveCharacterTextSplitter.createDocuments([markdownChunk])
    const smallerChunks = contextChunks.map((chunk) => `${chunk.pageContent}`)

    return smallerChunks
}

const splitPageHtml = async (algoliaHit: AlgoliaHit) => {
    const headingsRegex = /\n+(?=\s*#####\s(?!#))/
    const markdown = prefixHeaders(algoliaHit.contentBody)
        .replace(/\n{2,}/g, '\n')
        .replace(/^(#+\s+.+)\n(#+\s+.+\n)/gm, '$2')

    const markdownChunks = markdown.split(headingsRegex)

    const contextChunks = await Promise.all(
        markdownChunks.map(async (chunk) => {
            const header = chunk.match(/(#+\s+.+)\n/)?.[1] ?? ''
            const content = chunk.replace(header, '')
            const chunkMore = await splitPageHtmlChunkMore(content)
            const chunksWithHeader = chunkMore.map((chunk) => `${header.replaceAll('#####', '')}\n${chunk}`)
            return chunksWithHeader
        })
    )
    return contextChunks.flat()
}

const getAlgoliaVectors = async (algoliaHits: AlgoliaHit[]) => {
    const vectors = (
        await Promise.all(
            algoliaHits.map(async (algoliaHit) => {
                if (!algoliaHit?.contentBody) {
                    return []
                }

                const markdownChunks = await splitPageHtml(algoliaHit)

                if (!markdownChunks?.length) return []

                return markdownChunks.map((headingChunk: string, i: any) => ({
                    uid: `Algolia_${algoliaHit.url}_${i}`,
                    text: headingChunk,
                    metadata: {
                        source: 'algolia',
                        domain: algoliaHit?.domain?.toLowerCase(),
                        url: algoliaHit?.url?.toLowerCase()
                    }
                }))
            })
        )
    )
        .flat()
        .filter(Boolean)

    return vectors
}

const embedVectors = async (event: any, vectors: any[]) => {
    let outVectors: void[] = []

    if (vectors?.length && vectors?.every((x: any) => !!x)) {
        outVectors = await Promise.all(
            chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map((batchVectors, i) => {
                return inngest.send({
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

    return outVectors
}

export const processAlgoliaSearch: EventVersionHandler<{
    query?: string
    domain: string
    index: string
    preview?: boolean
    locale?: string
    facetFilters?: string[]
    fieldsToRetrieve?: string[]
}> = {
    event: 'algolia/search.sync',
    v: '1',
    handler: async ({ event }) => {
        console.time('processAlgoliaSearch')

        // {
        //   "name": "algolia/search.sync",
        //   "data": {
        //       "query":"*",
        //       "domain":"https://helpcenter.integralads.com",
        //       "index":"articles"
        //   },
        //   "user": {}
        // }

        const data = event.data
        const { query, domain, index, facetFilters = [], fieldsToRetrieve = [], locale = 'en-US', preview = false } = data

        const errors: string[] = []

        if (!index || index.trim() === '') {
            errors.push('Index is required.')
        }

        if (!domain || domain.trim() === '') {
            errors.push('Domain is required.')
        }

        if (errors.length) {
            throw new Error(errors.join(' '))
        }

        const searchClient: SearchClient = algoliasearch(ALGOLIA_APPLICATION_ID, ALGOLIA_ADMIN_API_KEY)

        const algoliaIndex: SearchIndex = searchClient.initIndex(index)

        let algoliaHits: AlgoliaHit[] = []

        //  TODO: Types RequestOptions
        const browseOptions: any = {
            batch: (batch: AlgoliaHit[]) => {
                algoliaHits = algoliaHits.concat(batch)
            }
        }

        if (query && query.trim() !== '') {
            browseOptions.query = query
        }

        // facetFilters.push(`preview:${preview}`);
        if (locale && locale.trim() !== '') {
            facetFilters.push(`locale:${locale}`)
        }

        if (facetFilters && facetFilters.length) {
            browseOptions.facetFilters = facetFilters
        }

        if (fieldsToRetrieve && fieldsToRetrieve.length) {
            const attributesToRetrieve = Array.from(
                new Set(['title', 'path', 'summary', 'contentBody', 'categories', 'locale', ...fieldsToRetrieve])
            )
            browseOptions.attributesToRetrieve = attributesToRetrieve
        }

        await algoliaIndex.browseObjects(browseOptions)

        algoliaHits = algoliaHits
            .filter((x) => !!x?.path && !!x?.contentBody)
            .map((hit: any) => {
                let markdown = ''

                hit.domain = domain

                if (domain && hit.path) hit.url = `${domain}${hit.path}`

                if (hit.title) {
                    markdown += `#${hit.title}\n`
                }

                if (hit.summary) {
                    markdown += `##${hit.summary}\n`
                }

                if (hit.contentBody) {
                    markdown += `${hit.contentBody}\n`
                }

                if (Object.keys(hit.categories).length) {
                    markdown += 'Categories:'
                    Object.keys(hit.categories).map((key) => {
                        markdown += hit.categories[key].join(',')
                    })
                    markdown += '\n'
                }

                hit.contentBody = markdown

                return hit
            })

        if (!algoliaHits.length) {
            console.log('No algolia hits')
        } else {
            const vectors = await getAlgoliaVectors(algoliaHits)
            // console.log('hits count: ', algoliaHits.length);
            // console.log('vectors count: ', vectors.length);
            // console.log(vectors);

            const embeddedVectors = await embedVectors(event, vectors)
        }

        console.timeEnd('processAlgoliaSearch')
    }
}
