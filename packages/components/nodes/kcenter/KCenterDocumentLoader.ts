import { TextSplitter } from 'langchain/text_splitter'
import { handleEscapeCharacters, INode, INodeData, INodeOutputsValue, INodeParams } from '../../src'
import { IKCDocument, KCenterApiClient } from './KCenterApiClient'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { Document } from '@langchain/core/documents'

class KCenterDocumentLoader_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    tags: string[]

    constructor() {
        this.label = 'KCenter Document Loader'
        this.name = 'kcenterDocumentLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'logo.svg'
        this.category = 'KCenter'
        this.description = `Load KCenter Documents`
        this.tags = ['Utilities']
        this.baseClasses = [this.type]

        this.inputs = [
            {
                label: 'KCenter API Connector',
                name: 'kcenterConnector',
                type: 'KCenterConnector',
                description: `KCenter API Connector.`,
                acceptVariable: false
            },
            {
                label: 'GUID',
                name: 'docGuid',
                type: 'string',
                description: `KCenter document guid.`,
                placeholder: `<guid>`,
                acceptVariable: true
            },
            {
                label: 'Language',
                name: 'docLang',
                type: 'string',
                description: `KCenter document language.`,
                placeholder: `<language>`,
                acceptVariable: true,
                optional: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                description: `The text splitter that is used to split the document content. Is ignored when returned as a KCDocument.`,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document object containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'concatinated TextContent of document',
                baseClasses: ['string', 'json']
            },
            {
                label: 'KCDocument',
                name: 'kcdoc',
                description: 'KCDocument object containing metadata and textContent',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        try {
            const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
            const docGuid = nodeData.inputs?.docGuid as string
            const docLang = nodeData.inputs?.docLang as string
            //const metadata = nodeData.inputs?.metadata
            const apiClient = nodeData.inputs?.kcenterConnector as KCenterApiClient
            const output = nodeData.outputs?.output as string

            // TODO: load KCenter Document
            const kcDoc: IKCDocument = await apiClient.loadDocument(docGuid, docLang)
            if (process.env.DEBUG === 'true') console.info('[KCenter]: kcDoc loaded')

            // Handle kcdoc output type early
            if (output === 'kcdoc') {
                return this.handleOutputType_kcdoc(kcDoc)
            }

            //TODO: should we convert into markdown here or should we make it configurable somehow?
            const newKcDoc = {
                id: docGuid + '_' + docLang,
                pageContent: this.convertKcDocumentContent(kcDoc),
                metadata: {
                    lang: docLang,
                    guid: docGuid,
                    title: kcDoc.title
                }
            }

            if (process.env.DEBUG === 'true') console.info('[KCenter]: Content as markdown: ' + newKcDoc.pageContent)

            let documents: Document[] = []
            if (textSplitter) {
                if (process.env.DEBUG === 'true') console.info('[KCenter]: splitt document')
                let splittedDocuments = await textSplitter.splitDocuments([newKcDoc])
                if (process.env.DEBUG === 'true') console.info('[KCenter]: splitt document into ' + splittedDocuments.length)
                for (const doc of splittedDocuments) {
                    documents.push(doc)
                }
            } else {
                documents.push(newKcDoc)
            }

            // Output Handling
            switch (output) {
                case 'document':
                    return documents
                case 'text':
                    return this.handleOutputType_text(documents)
                default:
                    throw new Error(`Unsupported output type: '${output}'`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            throw new Error(`Failed to initialize KCenter node: ${errorMessage}`)
        }
    }

    private convertKcDocumentContent(kcDoc: IKCDocument): string {
        //TODO: handle different document formats here
        const markdownContent = NodeHtmlMarkdown.translate(kcDoc.content, {})

        return markdownContent
    }

    private handleOutputType_text(kcdocs: Document[]): string {
        let finaltext = ''

        for (const doc of kcdocs) finaltext += `${doc.pageContent}\n`

        return handleEscapeCharacters(finaltext, false)
    }

    private handleOutputType_kcdoc(kcdoc: IKCDocument): IKCDocument {
        // TODO: do we need something here?
        return kcdoc
    }
}

module.exports = { nodeClass: KCenterDocumentLoader_DocumentLoaders }
