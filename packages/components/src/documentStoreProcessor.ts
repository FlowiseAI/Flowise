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
}
