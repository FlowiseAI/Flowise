import { CharacterTextSplitter, MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import path from 'path'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import fs from 'fs'
import { TextSplitter } from 'langchain/dist/text_splitter'

export class DocumentStore {
    constructor() {}
    async fetchChunks(documentStore: any): Promise<object> {
        let splitter: TextSplitter
        switch (documentStore.splitter) {
            case 'character-splitter':
                splitter = new CharacterTextSplitter({
                    chunkSize: documentStore.chunkSize ?? 1000,
                    chunkOverlap: documentStore.chunkOverlap ?? 50,
                    separator: documentStore.separator ?? '\n'
                })

                break
            case 'recursive-splitter':
                splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: documentStore.chunkSize ?? 1000,
                    chunkOverlap: documentStore.chunkOverlap ?? 50
                })

                break
            case 'token-splitter':
                break
            case 'code-splitter':
                splitter = RecursiveCharacterTextSplitter.fromLanguage(documentStore.codeLanguage, {
                    chunkSize: documentStore.chunkSize ?? 1000,
                    chunkOverlap: documentStore.chunkOverlap ?? 50
                })
                break
            case 'html-to-markdown-splitter':
                break
            case 'markdown-splitter':
                splitter = new MarkdownTextSplitter({
                    chunkSize: documentStore.chunkSize ?? 1000,
                    chunkOverlap: documentStore.chunkOverlap ?? 50
                })
                break
        }
        let alldocs: any[] = []

        for (let i = 0; i < documentStore.files.length; i++) {
            let fileObj = documentStore.files[i]
            const filename = fileObj.name
            let loader = null
            const blob = await fs.openAsBlob(fileObj.path)
            switch (path.extname(filename)) {
                case '.pdf':
                    loader = new PDFLoader(blob)
                    break
                case '.txt':
                default:
                    loader = new TextLoader(blob)
                    break
            }
            // @ts-ignore
            if (splitter) {
                const docs = await loader.loadAndSplit(splitter)
                alldocs.push(...docs)
                fileObj.chunks = docs
                fileObj.totalChunks = docs.length
            }
        }

        let totalLength = 0
        if (alldocs.length > 0) {
            alldocs.forEach((doc) => {
                totalLength += doc.pageContent.length
            })
        }
        // // return all docs if the user ask for more than we have
        // if (alldocs.length <= documentStore.noOfDocs) documentStore.noOfDocs = alldocs.length
        // // look at the docsCount param and return that many docs (only the pageContent)
        // const returnedDocs = []
        // for (let i = 0; i < documentStore.noOfDocs; i++) {
        //     returnedDocs.push({
        //         content: alldocs[i].pageContent,
        //         length: alldocs[i].pageContent.length
        //     })
        // }

        return {
            ...documentStore,
            totalChunks: alldocs.length,
            totalChars: totalLength
        }
    }
}
