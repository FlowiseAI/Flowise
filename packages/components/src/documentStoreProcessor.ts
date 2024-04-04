import { CharacterTextSplitter, MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import path from 'path'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import fs from 'fs'
import { TextSplitter } from 'langchain/dist/text_splitter'

export class DocumentStoreProcessor {
    constructor() {}
    public async splitIntoChunks(id: string, config: any, uploadedFiles: any[]): Promise<object> {
        let splitter: TextSplitter
        switch (config.splitter) {
            case 'character-splitter':
                splitter = new CharacterTextSplitter({
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50,
                    separator: config.separator ?? '\n'
                })

                break
            case 'recursive-splitter':
                splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50
                })

                break
            case 'token-splitter':
                break
            case 'code-splitter':
                splitter = RecursiveCharacterTextSplitter.fromLanguage(config.codeLanguage, {
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50
                })
                break
            case 'html-to-markdown-splitter':
                break
            case 'markdown-splitter':
                splitter = new MarkdownTextSplitter({
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50
                })
                break
        }

        for (let i = 0; i < uploadedFiles.length; i++) {
            let fileObj = uploadedFiles[i]
            if (fileObj.status === 'NEW') {
                const filename = fileObj.name
                let loader = null
                const blob = await fs.openAsBlob(fileObj.path)
                switch (path.extname(filename)) {
                    case '.pdf':
                        loader = new PDFLoader(blob)
                        break
                    default:
                        loader = new TextLoader(blob)
                        break
                }
                // @ts-ignore
                if (splitter && loader) {
                    const docs = await loader.loadAndSplit(splitter)
                    fileObj.chunks = docs
                    fileObj.totalChunks = docs.length
                }
            }
        }

        return { id: id, uploadedFiles: uploadedFiles }
    }

    public async split(config: any, fileObj: any): Promise<object> {
        let splitter: TextSplitter
        switch (config.splitter) {
            case 'character-splitter':
                splitter = new CharacterTextSplitter({
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50,
                    separator: config.separator ?? '\n'
                })

                break
            case 'recursive-splitter':
                splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50
                })

                break
            case 'token-splitter':
                break
            case 'code-splitter':
                splitter = RecursiveCharacterTextSplitter.fromLanguage(config.codeLanguage, {
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50
                })
                break
            case 'html-to-markdown-splitter':
                break
            case 'markdown-splitter':
                splitter = new MarkdownTextSplitter({
                    chunkSize: config.chunkSize ?? 1000,
                    chunkOverlap: config.chunkOverlap ?? 50
                })
                break
        }

        const filename = fileObj.name
        let loader = null
        const blob = await fs.openAsBlob(fileObj.path)
        switch (path.extname(filename)) {
            case '.pdf': {
                let legacy = config.pdfLegacyBuild
                if (config.pdfUsage === 'perFile') {
                    loader = new PDFLoader(blob, {
                        splitPages: false,
                        pdfjs: () =>
                            // @ts-ignore
                            legacy ? import('pdfjs-dist/legacy/build/pdf.js') : import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
                    })
                } else {
                    loader = new PDFLoader(blob, {
                        pdfjs: () =>
                            // @ts-ignore
                            legacy ? import('pdfjs-dist/legacy/build/pdf.js') : import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
                    })
                }
                break
            }
            default:
                loader = new TextLoader(blob)
                break
        }
        let chunks: any[] = []
        // @ts-ignore
        if (splitter && loader) {
            chunks = await loader.loadAndSplit(splitter)
        }
        const totalChunks = chunks.length
        // return all docs if the user ask for more than we have
        if (totalChunks <= config.previewChunkCount) config.previewChunkCount = totalChunks

        if (totalChunks > config.previewChunkCount) chunks = chunks.slice(0, config.previewChunkCount)

        return { chunks: chunks, totalChunks: totalChunks, previewChunkCount: config.previewChunkCount }
    }
}
