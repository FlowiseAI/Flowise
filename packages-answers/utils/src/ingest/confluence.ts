import { inngest } from './client'
import { EventVersionHandler } from './EventVersionHandler'
import chunkArray from '../utilities/chunkArray'
import { ConfluencePage, User } from 'types'
import { jiraAdfToMarkdown } from '../utilities/jiraAdfToMarkdown'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { getUserClients } from '../auth/getUserClients'

const PINECONE_VECTORS_BATCH_SIZE = 50

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

const recursiveCharacterTextSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 6000 })
const splitPageHtmlChunkMore = async (markdownChunk: string) => {
    const contextChunks = await recursiveCharacterTextSplitter.createDocuments([markdownChunk])
    const smallerChunks: string[] = contextChunks.map((chunk: { pageContent: any }) => `${chunk.pageContent}`)

    return smallerChunks
}

const splitPageAdf = async (page: ConfluencePage) => {
    if (!page?.body?.atlas_doc_format?.value) return []
    const docJson = JSON.parse(page.body.atlas_doc_format.value)
    page.content = `# ${page.title}\n${jiraAdfToMarkdown(docJson)}`

    const headingsRegex = /\n+(?=\s*#####\s(?!#))/
    const markdown = prefixHeaders(page.content)
        .replace(/\n{2,}/g, '\n')
        .replace(/^(#+\s+.+)\n(#+\s+.+\n)/gm, '$2')

    const markdownChunks = markdown.split(headingsRegex)

    const contextChunks = await Promise.all(
        markdownChunks.map(async (chunk) => {
            const header = chunk.match(/(#+\s+.+)\n/)?.[1] ?? ''
            const content = chunk.replace(header, '')
            const chunkMore = await splitPageHtmlChunkMore(content)
            const chunksWithHeader = chunkMore.map((chunk: any) => `${header}\n${chunk}`)
            return chunksWithHeader
        })
    )

    return contextChunks.flat()
}

const getConfluencePagesVectors = async (user: User, confluencePages: ConfluencePage[]) => {
    const vectors = (
        await Promise.all(
            confluencePages.map(async (page) => {
                if (!page?.body?.atlas_doc_format?.value) {
                    return []
                }

                const markdownChunks = await splitPageAdf(page)
                if (!markdownChunks?.length) return []

                return markdownChunks.map((headingChunk: string, i: any) => ({
                    uid: `Confluence_${page.title}_${i}`,
                    text: headingChunk,
                    metadata: {
                        source: 'confluence',
                        url: `https://app.atlassian.com/wiki/spaces/${page.spaceId}/pages/${page.id}/${page.title}`,

                        organizationId: user?.organizationId,
                        id: page.id,
                        spaceId: page.spaceId.toString(),
                        status: page.status,
                        title: page.title,
                        authorId: page.authorId,
                        createdAt: page.createdAt
                    }
                }))
            })
        )
    )
        .flat()
        .filter(Boolean)

    return vectors
}

const embedVectors = async (user: User, event: any, vectors: any[]) => {
    let outVectors: void[] = []

    if (vectors?.length && vectors?.every((x: any) => !!x)) {
        outVectors = await Promise.all(
            chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map((batchVectors, i) => {
                inngest.send({
                    v: '1',
                    ts: new Date().valueOf(),
                    name: 'pinecone/vectors.upserted',
                    data: {
                        _page: i,
                        _total: vectors.length,
                        _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                        vectors: batchVectors,
                        organizationId: user.organizationId
                    },
                    user: event.user
                })
            })
        )
    }

    return outVectors
}

export const processConfluencePages: EventVersionHandler<{ pageIds: string[] }> = {
    event: 'confluence/app.sync',
    v: '1',
    handler: async ({ event }) => {
        const { user } = event
        if (!user) throw new Error('User is requierd')
        const { confluenceClient } = await getUserClients(user)
        const confluencePages = (await confluenceClient.getConfluencePages()) as ConfluencePage[]
        const vectors = await getConfluencePagesVectors(user, confluencePages)
        const embeddedVectors = await embedVectors(user, event, vectors)
    }
}

export const processConfluencePage: EventVersionHandler<{ pageIds: string[] }> = {
    event: 'confluence/page.sync',
    v: '1',
    handler: async ({ event }) => {
        const data = event.data
        const { pageIds } = data
        const { user } = event
        if (!user) throw new Error('User is requierd')
        const { confluenceClient } = await getUserClients(user)
        // Create/Upsert confluence document
        // Get only the pending for sync pages
        // only update the pending for sync pages
        const confluencePages = (await confluenceClient.pageLoader.loadMany(pageIds)) as ConfluencePage[]
        const vectors = await getConfluencePagesVectors(user, confluencePages)
        const embeddedVectors = await embedVectors(user, event, vectors)
    }
}
