import { URL } from 'url'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { NodeHtmlMarkdown, TranslatorConfigObject } from 'node-html-markdown'

import { prisma } from '@db/client'

import { inngest } from './client'
import { webPageLoader } from '../web'

import getSitemapUrls from '../utilities/getSitemapUrls'
import chunkArray from '../utilities/chunkArray'
import getAxiosErrorMessage from '../utilities/getAxiosErrorMessage'
import { getUniqueUrls, getUniqueUrl } from '../getUniqueUrls'
import { fetchSitemapUrls } from '../fetchSitemapUrls'
import getPendingSyncURLs from './getPendingSyncURLs'
import { getUniqueDomains, getUrlDomain } from '../getUrlDomain'

import type { EventVersionHandler } from './EventVersionHandler'
import type { WebPage } from 'types'
import getDomainUrlsFromMarkdown from '../utilities/getDomainUrlsFromMarkdown'

const PINECONE_VECTORS_BATCH_SIZE = 100
const WEB_PAGE_SYNC_BATCH_SIZE = 10

const excludeTags = [
    'header',
    'footer',
    'nav',
    'head',
    'noscript',
    'iframe',
    '.menu',
    'script',
    '.ad',
    '.ads',
    'style',
    'aside',
    'link',
    '[role="tree"]',
    '[role="navigation"]',
    'svg',
    'video',
    'canvas',
    'form',
    '[role="alert"]',
    'cite',
    'sup',
    'hr'
]

const customTranslators: TranslatorConfigObject = Object.assign(
    {},
    ...excludeTags.map((tag) => ({ [tag]: { ignore: true, recurse: false } }))
)

let CreateMarkdownTidied = new NodeHtmlMarkdown({ maxConsecutiveNewlines: 2 }, customTranslators)
let CreateMarkdownForUrlParse = new NodeHtmlMarkdown()

const recursiveCharacterTextSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
    chunkSize: 5000,
    chunkOverlap: 200,
    separators: ['##', '\n\n', '\n', ' ', ''],
    keepSeparator: true
})

const getWebPagesVectors = async (webPages: WebPage[]) => {
    const vectors = (
        await Promise.all(
            webPages.map(async (page) => {
                if (!page?.content) {
                    console.log(`[getWebPagesVectors] No content found for ${page.url.toLowerCase}`)
                    return []
                }

                const pageContent = page.content.replace(/(\s){2,}/g, '$1').replace(/(.)\1{5,}/g, '$1')

                const markdownChunks = await recursiveCharacterTextSplitter.splitText(pageContent)

                if (!markdownChunks?.length) {
                    console.log(`[getWebPagesVectors] No markdownChunks found for ${page.url}`)
                    return []
                }

                return markdownChunks.map((text: string, i: any) => ({
                    uid: `WebPage_${page.url}_${i}`,
                    text,
                    metadata: {
                        source: 'web',
                        text,
                        domain: page?.domain?.toLowerCase(),
                        url: page?.url?.toLowerCase()
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
    let outVectors: any[] = []

    if (vectors?.length && vectors?.every((x: any) => !!x)) {
        try {
            outVectors = await Promise.all(
                chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map(async (batchVectors: any, i: any) => {
                    try {
                        const vectorSends = await inngest.send({
                            v: '1',

                            name: 'pinecone/vectors.upserted',
                            data: {
                                _page: i,
                                _total: vectors.length,
                                _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                                vectors: batchVectors
                            },
                            user: event.user
                        })
                        return vectorSends
                    } catch (error: unknown) {
                        let message = getAxiosErrorMessage(error)
                        return { error: `[Error in embedVectors] ${message}` }
                    }
                })
            )

            const errors = outVectors.filter((result) => !!result?.error)

            if (errors?.length) {
                // TODO - handle errors
                throw errors[0]
            }
        } catch (error: unknown) {
            let message = getAxiosErrorMessage(error)
            return { error: `[Error in writeVectorsToIndex] ${message}` }
        }
    }

    return outVectors
}

const getUrls = async (domain: string, path?: string) => {
    const [sitemapUrls, sitemapXml, sitemapIndexXml, sitemap1Xml] = await Promise.all([
        fetchSitemapUrls(domain),
        getSitemapUrls(`${domain}/sitemap.xml`),
        getSitemapUrls(`${domain}/sitemap-index.xml`),
        getSitemapUrls(`${domain}/sitemap1.xml`)
    ])

    const urls = [...(sitemapUrls || []), ...(sitemapXml || []), ...(sitemapIndexXml || []), ...(sitemap1Xml || [])]

    if (!path) {
        return urls
    }

    const uniquePath = getUniqueUrl(path)

    const uniqueUrls = getUniqueUrls([
        ...(sitemapUrls || []),
        ...(sitemapXml || []),
        ...(sitemapIndexXml || []),
        ...(sitemap1Xml || [])
    ]).filter((url) => {
        // This will match anything that starts with this path.
        // Ex: /blog as the path would match /blog/page and /blogger-was-here/page
        // Potential TODO to use regex or hardcode a slash at the end of the startsWith check
        return url.startsWith(uniquePath)
    })

    return uniqueUrls
}

export const processWebUrlScrape: EventVersionHandler<{
    urls: string[]
    byDomain: boolean
    recursive: boolean
}> = {
    event: 'web/urls.sync',
    v: '1',
    handler: async ({ event }) => {
        const data = event.data
        const { urls, byDomain, recursive } = data

        if (byDomain) {
            const domains = getUniqueDomains(urls)
            const domainPromises = domains.map((domain) =>
                inngest.send({
                    v: event.v,

                    name: 'web/domain.sync',
                    data: {
                        domain
                    },
                    user: event.user
                })
            )

            if (domainPromises?.length) {
                await Promise.all(domainPromises)
            }
        } else {
            const uniqueUrls = getUniqueUrls(urls)
            if (!uniqueUrls.length) {
                return
            }

            inngest.send({
                v: event.v,
                name: 'web/page.sync',
                data: {
                    urls: uniqueUrls
                },
                user: event.user
            })
        }
    }
}

export const processWebDomainScrape: EventVersionHandler<{ domain: string; recursive: boolean }> = {
    event: 'web/domain.sync',
    v: '1',
    handler: async ({ event }) => {
        const data = event.data
        const { domain, recursive } = data

        if (!domain) {
            console.log('[web/domain.sync] No domain provided')
            return
        }

        const urls = await (!!recursive ? [] : getUrls(domain))

        if (!urls?.length) {
            console.log('[web/domain.sync] Could not extract URLs from sitemap.  Preparing deep sync')
            inngest.send({
                v: event.v,
                name: 'web/page.sync',
                data: {
                    recursive: true,
                    parentId: `${new Date().valueOf()}-recursive`,
                    urls: [domain]
                },
                user: event.user
            })
        } else {
            const uniqueUrls = getUniqueUrls(urls)
            const pendingSyncURLs = await getPendingSyncURLs(uniqueUrls)

            if (!pendingSyncURLs?.length) {
                console.log('[web/domain.sync] No pending sync urls were found.')
            } else {
                try {
                    await Promise.all(
                        chunkArray(pendingSyncURLs, WEB_PAGE_SYNC_BATCH_SIZE).map(async (urls) =>
                            inngest.send({
                                v: event.v,
                                name: 'web/page.sync',
                                data: {
                                    _total: pendingSyncURLs.length,
                                    urls
                                },
                                user: event.user
                            })
                        )
                    )
                } catch (error) {
                    console.log(error)
                } finally {
                }
            }
        }
    }
}

export const processWebScrape: EventVersionHandler<{
    urls: string[]
    recursive: boolean
    parentId?: string
}> = {
    event: 'web/page.sync',
    v: '1',
    handler: async ({ event }) => {
        const { urls, recursive, parentId } = event?.data
        if (!urls) {
            throw new Error('Invalid input data: missing "urls" property')
        }

        // TODO: Validate if the URL exists in database
        // TODO: Verify how long it passed since it was synced

        const uniqueUrls = getUniqueUrls(Array.from(urls))

        const pendingSyncURLs = await getPendingSyncURLs(uniqueUrls)
        if (!pendingSyncURLs?.length) {
            console.log('[web/page.sync] No pending sync urls were found.')
        }

        // Need to use the unique URLs' original case sensitivity as not all sites treat mixed cases the same
        const finalUrls = uniqueUrls.filter((url) => pendingSyncURLs.includes(url.toLocaleLowerCase()))

        if (!finalUrls?.length) {
            console.log('[web/page.sync] No final urls were found.')
        } else {
            await prisma.document.updateMany({
                where: { url: { in: pendingSyncURLs } },
                data: {
                    status: 'syncing'
                }
            })

            const webPagesHtml = (await webPageLoader.loadMany(finalUrls)) as string[]

            let recursiveUrls: string[] = []
            const webPages = await Promise.all(
                finalUrls.map(async (url, index) => {
                    const domain = new URL(url).origin
                    const webData: WebPage = {
                        url,
                        domain,
                        content: webPagesHtml[index]
                    }

                    if (!webData?.content?.length) {
                        return { ...webData, content: '' }
                    }

                    // Now that we have valid HTML, check if this should be recursive so we can build out the spidering
                    if (recursive) {
                        const urlMarkdown = CreateMarkdownForUrlParse.translate(webData.content)
                        recursiveUrls = [...recursiveUrls, ...getDomainUrlsFromMarkdown(urlMarkdown, domain)]

                        if (recursiveUrls?.length) {
                            const recursiveId = parentId ?? new Date().valueOf()
                            const recursiveEvents = recursiveUrls.map((url) => {
                                return {
                                    v: event.v,
                                    id: `${recursiveId}-${url}`,
                                    name: 'web/page.sync',
                                    data: {
                                        urls: [url],
                                        recursive,
                                        parentId: recursiveId
                                    },
                                    user: event.user
                                }
                            })

                            if (recursiveEvents?.length) {
                                await inngest.send(recursiveEvents)
                            }
                        }
                    }

                    webData.content = CreateMarkdownTidied.translate(webData.content)

                    return webData
                })
            )

            interface FilteredPages {
                validPages: WebPage[]
                invalidPages: WebPage[]
            }

            const { validPages, invalidPages }: FilteredPages = webPages.reduce(
                (acc: FilteredPages, page: WebPage) => {
                    if (page?.content && page.content !== '') {
                        acc.validPages.push(page)
                    } else {
                        acc.invalidPages.push(page)
                    }
                    return acc
                },
                { validPages: [], invalidPages: [] }
            )

            // TODO: Update to remove from Pinecone as well
            if (!!invalidPages?.length) {
                console.log(
                    `[web/page.sync] Updating documents ${invalidPages.map((p) => p.url.toLowerCase())} from DB due to no valid content`
                )
                await prisma.document.updateMany({
                    where: {
                        url: { in: invalidPages.map((p) => p.url.toLowerCase()) }
                    },
                    data: {
                        status: 'error',
                        lastSyncedAt: new Date()
                    }
                })
            }

            const vectors = await getWebPagesVectors(validPages)

            const embeddedVectors = await embedVectors(event, vectors)

            return pendingSyncURLs
        }
    }
}

export const processWebPathScrape: EventVersionHandler<{ path: string; forceRecursion: boolean }> = {
    event: 'web/path.sync',
    v: '1',
    handler: async ({ event }) => {
        const data = event.data
        const { path, forceRecursion } = data

        if (!path) {
            console.log('[web/path.sync] No path provided')
            return
        }
        const domain = getUrlDomain(path)

        if (!domain) {
            console.log('[web/path.sync] Could not fetch domain')
            return
        }

        const urls = forceRecursion ? [] : await getUrls(domain, path)

        if (forceRecursion || !urls?.length) {
            console.log('[web/path.sync] Could not extract URLs from sitemap.  Calling Scraper')
            inngest.send({
                v: event.v,
                name: 'web/page.sync',
                data: {
                    recursive: true,
                    parentId: `${new Date().valueOf()}-recursive`,
                    urls: [path]
                },
                user: event.user
            })
        } else {
            const pendingSyncURLs = await getPendingSyncURLs(urls)
            // Need to use the unique URLs' original case sensitivity as not all sites treat mixed cases the same
            const finalUrls = urls.filter((url) => pendingSyncURLs.includes(url.toLocaleLowerCase()))
            if (!finalUrls?.length) {
                console.log('[web/path.sync] No final urls were found.')
            } else {
                try {
                    await Promise.all(
                        chunkArray(finalUrls, WEB_PAGE_SYNC_BATCH_SIZE).map(async (urls) =>
                            inngest.send({
                                v: event.v,
                                name: 'web/page.sync',
                                data: {
                                    _total: finalUrls.length,
                                    urls
                                },
                                user: event.user
                            })
                        )
                    )
                } catch (error) {
                    console.log(error)
                } finally {
                }
            }
        }
    }
}
