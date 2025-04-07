import mammoth from 'mammoth'
import path from 'path'
import { inngest } from './client'
import { Readable } from 'stream'
import { getDocument } from 'pdfjs-dist'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

import { prisma } from '@db/client'
import { EventVersionHandler } from './EventVersionHandler'
import chunkArray from '../utilities/chunkArray'
import getAxiosErrorMessage from '../utilities/getAxiosErrorMessage'

import type { DocumentRecord } from 'types'

const S3_STORAGE_ACCESS_KEY_ID = process.env.S3_STORAGE_ACCESS_KEY_ID
const S3_STORAGE_SECRET_ACCESS_KEY = process.env.S3_STORAGE_SECRET_ACCESS_KEY
const S3_STORAGE_BUCKET_NAME = process.env.S3_STORAGE_BUCKET_NAME
const AWS_S3_REGION = process.env.S3_STORAGE_REGION

const PINECONE_VECTORS_BATCH_SIZE = 50

interface TextMarkedContent {
    type: 'beginMarkedContent' | 'beginMarkedContentProps' | 'endMarkedContent'
    id?: string
}

interface TextItem {
    str: string
    dir: string | 'ttb' | 'ltr' | 'rtl'
    transform: Array<any>
    width: number
    height: number
    fontName: string
    hasEOL: boolean
}

interface PDFMetadataInfo {
    PDFFormatVersion: string
    Language: string | null
    EncryptFilterName: string | null
    IsLinearized: boolean
    IsAcroFormPresent: boolean
    IsXFAPresent: boolean
    IsCollectionPresent: boolean
    IsSignaturesPresent: boolean
    Title: string
    Producer: string
}

interface PDFMetadata {
    info: PDFMetadataInfo | Object
    contentDispositiondocumentName?: string | null
    contentLength?: number | null
}

function calculateLineHeightRange(lines: (TextItem | TextMarkedContent)[]): [number, number] {
    let minHeight = Number.MAX_VALUE
    let maxHeight = Number.MIN_VALUE

    for (const line of lines) {
        //@ts-ignore-next-line
        const height = line.height
        if (height < minHeight) {
            minHeight = height
        }
        if (height > maxHeight) {
            maxHeight = height
        }
    }

    return [minHeight, maxHeight]
}

const getHeaderTag = (height: number, lineHeightRange: [number, number]): string | null => {
    if (!height) return null

    const rangeSize = lineHeightRange[1] - lineHeightRange[0] + 1
    const position = Math.ceil((height - lineHeightRange[0] + 1) / (rangeSize / 7))

    if (position === 1) return null

    return `h${Math.abs(position - 7) + 1}`
}

const convertToValidHTML = (lines: (TextItem | TextMarkedContent)[]): string => {
    let htmlString = ''
    let isBulletListOpen = false
    let isDivOpen = false

    if (lines.length === 0) {
        return htmlString
    }
    //@ts-ignore-next-line
    const filteredLines = lines.filter((line) => line.height !== 0)
    if (filteredLines.length === 0) {
        return htmlString
    }

    const lineHeightRange = calculateLineHeightRange(filteredLines)
    //@ts-ignore-next-line
    let prevTransformY = filteredLines[0].transform?.[5]
    //@ts-ignore-next-line
    let prevHeight = filteredLines[0]?.height
    let prevHeaderTag

    for (let i = 0; i < filteredLines.length; i++) {
        const line = filteredLines[i]
        //@ts-ignore-next-line
        const isBulletPoint = line.str?.trim() === '●'

        if (isBulletPoint) {
            if (!isBulletListOpen) {
                htmlString += '<ul>'
                isBulletListOpen = true
            }

            //@ts-ignore-next-line
            htmlString += `<li>${line.str}</li>`
        } else {
            if (isBulletListOpen) {
                htmlString += '</ul>'
                isBulletListOpen = false
            }
            //@ts-ignore-next-line
            const headerTag = getHeaderTag(line.height, lineHeightRange)
            //@ts-ignore-next-line
            const isnewParagraphByHeight = line.transform?.[5] < prevTransformY - 2 * prevHeight
            const isNewParagraph = !i || headerTag !== prevHeaderTag || isnewParagraphByHeight

            if (headerTag || isNewParagraph) {
                if (isDivOpen) {
                    htmlString += '</div>'
                    isDivOpen = false
                }

                if (headerTag !== null) {
                    if (isNewParagraph) {
                        if (prevHeaderTag) {
                            htmlString += `</${prevHeaderTag}>`
                        }
                        htmlString += `<${headerTag}>`
                    }
                } else {
                    if (prevHeaderTag) {
                        htmlString += `</${prevHeaderTag}>`
                    }
                    htmlString += '<div>'
                    isDivOpen = true
                }
                prevHeaderTag = headerTag
            }

            //@ts-ignore-next-line
            htmlString += `${line.str} `
        }

        //@ts-ignore-next-line
        prevTransformY = line.transform?.[5]
        //@ts-ignore-next-line
        prevHeight = line.height
    }

    if (isBulletListOpen) {
        htmlString += '</ul>'
    }

    if (prevHeaderTag) {
        htmlString += `</${prevHeaderTag}>`
    } else if (isDivOpen) {
        htmlString += '</div>'
    }

    return htmlString
}

// Function to convert PDF to HTML
const convertPdfToHtml = async (pdfBuffer: Uint8Array): Promise<string> => {
    const loadingTask = getDocument({ data: pdfBuffer })
    const pdfDocument = await loadingTask.promise
    const metadata: PDFMetadata = await pdfDocument.getMetadata()

    let pageLines: (TextItem | TextMarkedContent)[] = []
    for (let j = 1; j <= pdfDocument.numPages; j++) {
        const page = await pdfDocument.getPage(j)

        let textContent = await page.getTextContent({ includeMarkedContent: true })

        //@ts-ignore-next-line
        pageLines = [...pageLines, ...textContent.items]
    }

    const validHtml = convertToValidHTML(pageLines)
    //@ts-ignore-next-line
    return `<html><body><h1>${metadata?.info?.Title}</h1>${validHtml}</body></html>`
}

const splitDocumentHtmlChunkMore = async (markdownChunk: string) => {
    const contextChunks = await recursiveCharacterTextSplitter.createDocuments([markdownChunk])
    const smallerChunks = contextChunks.map((chunk) => `${chunk.pageContent}`)

    return smallerChunks
}

const splitDocumentHtml = async (iDocument: DocumentRecord) => {
    const document = NodeHtmlMarkdown.translate(iDocument.content, {}, undefined, undefined)
    const headingsRegex = /\n+(?=\s*#####\s(?!#))/
    const markdown = prefixHeaders(document)
        .replace(/\n{2,}/g, '\n')
        .replace(/^(#+\s+.+)\n(#+\s+.+\n)/gm, '$2')

    const markdownChunks = markdown.split(headingsRegex)

    const contextChunks = await Promise.all(
        markdownChunks.map(async (chunk) => {
            const header = chunk.match(/(#+\s+.+)\n/)?.[1] ?? ''
            const content = chunk.replace(header, '')
            if (!content.trim().length || !header?.trim().length) {
                return ['']
            }
            const chunkMore = await splitDocumentHtmlChunkMore(content)
            const chunksWithHeader = chunkMore.map((chunk) => `${header.replace('#####', '')}\n${chunk}`)
            return chunksWithHeader
        })
    )
    return contextChunks.flat().filter((x) => x.trim() !== '')
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

const recursiveCharacterTextSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 6000 })

const getDocumentRecordsVectors = async (DocumentRecords: DocumentRecord[]) => {
    const vectors = (
        await Promise.all(
            DocumentRecords.map(async (document) => {
                if (!document?.content) {
                    return []
                }

                const markdownChunks = await splitDocumentHtmlChunkMore(document.content)

                if (!markdownChunks?.length) return []

                return markdownChunks.map((headingChunk: string, i: any) => ({
                    uid: `Document_${document.title}_${i}`,
                    text: headingChunk,
                    metadata: {
                        source: 'document',
                        url: document?.url,
                        title: document?.title?.toLowerCase()
                    }
                }))
            })
        )
    )
        .flat()
        .filter(Boolean)

    return vectors
}

export const processDocument: EventVersionHandler<{
    documentName: string
    url: string
    documentId: string
    organizationId?: string
}> = {
    event: 'documents/aws.index',
    v: '1',
    handler: async ({ event }) => {
        const user = await prisma.user.findUnique({
            where: { id: event?.user?.id! },
            include: { currentOrganization: true }
        })

        if (!user?.id) throw new Error('No user found')

        if (!S3_STORAGE_ACCESS_KEY_ID || !S3_STORAGE_SECRET_ACCESS_KEY || !S3_STORAGE_BUCKET_NAME) {
            console.error('You must use valid keys to perform this action.')
            return null
        }

        const data = event.data
        const { documentName, url, documentId } = data
        let organizationId = user.organizationId ?? ''
        if (user.role === 'superadmin' && data.organizationId) {
            organizationId = data.organizationId
        }

        const document = await prisma.document.findUnique({
            where: { id: documentId }
        })

        if (!document) {
            throw new Error('No document found')
        }

        const documentExtension = path.extname(documentName).slice(1)

        const s3Client = new S3Client({
            region: AWS_S3_REGION,
            credentials: {
                accessKeyId: S3_STORAGE_ACCESS_KEY_ID,
                secretAccessKey: S3_STORAGE_SECRET_ACCESS_KEY
            }
        })

        const command = new GetObjectCommand({
            Bucket: S3_STORAGE_BUCKET_NAME,
            Key: document.url
        })

        const s3Response = await s3Client.send(command)
        if (!s3Response || !s3Response.Body) {
            console.error('No response from s3Client')
            return null
        }

        let pageHtml

        if (documentExtension === 'pdf') {
            const documentData: Uint8Array = await new Promise((resolve, reject) => {
                const chunks: any[] = []
                if (typeof (s3Response.Body as Readable)?.on === 'function') {
                    ;(s3Response.Body as Readable)
                        .on('data', (chunk: any) => chunks.push(chunk))
                        .on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))))
                        .on('error', reject)
                } else if (typeof (s3Response.Body as ReadableStream)?.getReader === 'function') {
                    // Body is a WHATWG stream
                    const reader = (s3Response.Body as ReadableStream).getReader()
                    reader
                        .read()
                        .then(function process({ done, value }): Promise<void> {
                            if (done) {
                                resolve(new Uint8Array(Buffer.concat(chunks)))
                            } else {
                                chunks.push(value)
                                return reader.read().then(process)
                            }
                            return Promise.resolve()
                        })
                        .catch(reject)
                }
            })
            try {
                pageHtml = await convertPdfToHtml(documentData)
            } catch (err) {
                console.log('Error converting pdf to html')
                console.error(err)
            }
        } else if (documentExtension === 'docx') {
            const documentData: Buffer = await new Promise((resolve, reject) => {
                const chunks: any[] = []

                if (typeof (s3Response.Body as Readable)?.on === 'function') {
                    ;(s3Response.Body as Readable)
                        .on('data', (chunk: any) => chunks.push(chunk))
                        .on('end', () => resolve(Buffer.concat(chunks)))
                        .on('error', reject)
                } else if (typeof (s3Response.Body as ReadableStream)?.getReader === 'function') {
                    // Body is a WHATWG stream
                    const reader = (s3Response.Body as ReadableStream).getReader()
                    reader
                        .read()
                        .then(function process({ done, value }): Promise<void> {
                            if (done) {
                                resolve(Buffer.concat(chunks))
                            } else {
                                chunks.push(value)
                                return reader.read().then(process)
                            }
                            return Promise.resolve()
                        })
                        .catch(reject)
                }
            })
            const mammothResult = await mammoth.convertToHtml({ buffer: documentData })
            pageHtml = mammothResult.value
        } else if (documentExtension === 'doc') {
            // Add your DOC-to-HTML conversion code here.
        }

        if (!pageHtml) {
            console.error('No pageHtml')
            return null
        }

        const documentRecord: DocumentRecord = {
            url,
            title: documentName,
            content: pageHtml
        }

        await prisma.document.update({
            where: {
                id: documentId
            },
            data: {
                content: documentRecord.content,
                status: 'synced'
            }
        })

        const vectors = await getDocumentRecordsVectors([documentRecord])

        await embedVectors(organizationId, event, vectors)

        return null
    }
}

const embedVectors = async (organizationId: string, event: any, vectors: any[]) => {
    let outVectors: any[] = []

    if (vectors?.length && vectors?.every((x: any) => !!x)) {
        try {
            outVectors = await Promise.all(
                chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map(async (batchVectors, i) => {
                    try {
                        const vectorSends = await inngest.send({
                            v: '1',
                            ts: new Date().valueOf(),
                            name: 'pinecone/vectors.upserted',
                            data: {
                                _page: i,
                                _total: vectors.length,
                                _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                                vectors: batchVectors,
                                organizationId
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
