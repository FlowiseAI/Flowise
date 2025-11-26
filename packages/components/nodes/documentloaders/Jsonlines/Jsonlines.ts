import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import jsonpointer from 'jsonpointer'
import { getFileFromStorage, handleEscapeCharacters, INodeOutputsValue } from '../../../src'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { Document } from '@langchain/core/documents'
import type { readFile as ReadFileT } from 'node:fs/promises'

const howToUseCode = `
You can add metadata dynamically from the document:

For example, if the document is:
\`\`\`jsonl
{
    "source": "www.example.com", "content": "Hello World!"
}
{
    "source": "www.example2.com", "content": "Hi World!"
}
\`\`\`

You can have the "source" value as metadata by returning the following:
\`\`\`json
{
    "source": "/source"
}
\`\`\``

class Jsonlines_DocumentLoaders implements INode {
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

    constructor() {
        this.label = 'Json Lines File'
        this.name = 'jsonlinesFile'
        this.version = 3.0
        this.type = 'Document'
        this.icon = 'jsonlines.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from JSON Lines files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Jsonlines File',
                name: 'jsonlinesFile',
                type: 'file',
                fileType: '.jsonl'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Pointer Extraction',
                name: 'pointerName',
                type: 'string',
                placeholder: 'key',
                description: 'Ex: { "key": "value" }, Pointer Extraction = "key", "value" will be extracted as pageContent of the chunk',
                optional: false
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description:
                    'Additional metadata to be added to the extracted documents. You can add metadata dynamically from the document. Ex: { "key": "value", "source": "www.example.com" }. Metadata: { "page": "/source" } will extract the value of the key "source" from the document and add it to the metadata with the key "page"',
                hint: {
                    label: 'How to use',
                    value: howToUseCode
                },
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const jsonLinesFileBase64 = nodeData.inputs?.jsonlinesFile as string
        const pointerName = nodeData.inputs?.pointerName as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let docs: IDocument[] = []
        let files: string[] = []

        let pointer = '/' + pointerName.trim()
        //FILE-STORAGE::["CONTRIBUTING.md","LICENSE.md","README.md"]
        if (jsonLinesFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = jsonLinesFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const orgId = options.orgId
            const chatflowid = options.chatflowid

            for (const file of files) {
                if (!file) continue
                const fileData = await getFileFromStorage(file, orgId, chatflowid)
                const blob = new Blob([fileData])
                const loader = new JSONLinesLoader(blob, pointer, metadata)

                if (textSplitter) {
                    let splittedDocs = await loader.load()
                    splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                    docs.push(...splittedDocs)
                } else {
                    docs.push(...(await loader.load()))
                }
            }
        } else {
            if (jsonLinesFileBase64.startsWith('[') && jsonLinesFileBase64.endsWith(']')) {
                files = JSON.parse(jsonLinesFileBase64)
            } else {
                files = [jsonLinesFileBase64]
            }

            for (const file of files) {
                if (!file) continue
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                const loader = new JSONLinesLoader(blob, pointer, metadata)

                if (textSplitter) {
                    let splittedDocs = await loader.load()
                    splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                    docs.push(...splittedDocs)
                } else {
                    docs.push(...(await loader.load()))
                }
            }
        }

        if (metadata) {
            let parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            parsedMetadata = removeValuesStartingWithSlash(parsedMetadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {
                              ...parsedMetadata
                          }
                        : omit(
                              {
                                  ...doc.metadata,
                                  ...parsedMetadata
                              },
                              omitMetadataKeys
                          )
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {}
                        : omit(
                              {
                                  ...doc.metadata
                              },
                              omitMetadataKeys
                          )
            }))
        }

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

const removeValuesStartingWithSlash = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {}

    for (const key in obj) {
        const value = obj[key]
        if (typeof value === 'string' && value.startsWith('/')) {
            continue
        }
        result[key] = value
    }

    return result
}

class TextLoader extends BaseDocumentLoader {
    constructor(public filePathOrBlob: string | Blob) {
        super()
    }

    protected async parse(raw: string): Promise<{ pageContent: string; metadata: ICommonObject }[]> {
        return [{ pageContent: raw, metadata: {} }]
    }

    public async load(): Promise<Document[]> {
        let text: string
        let metadata: Record<string, string>
        if (typeof this.filePathOrBlob === 'string') {
            const { readFile } = await TextLoader.imports()
            text = await readFile(this.filePathOrBlob, 'utf8')
            metadata = { source: this.filePathOrBlob }
        } else {
            text = await this.filePathOrBlob.text()
            metadata = { source: 'blob', blobType: this.filePathOrBlob.type }
        }
        const parsed = await this.parse(text)
        parsed.forEach((parsedData, i) => {
            const { pageContent } = parsedData
            if (typeof pageContent !== 'string') {
                throw new Error(`Expected string, at position ${i} got ${typeof pageContent}`)
            }
        })
        return parsed.map((parsedData, i) => {
            const { pageContent, metadata: additionalMetadata } = parsedData
            return new Document({
                pageContent,
                metadata:
                    parsed.length === 1
                        ? { ...metadata, ...additionalMetadata }
                        : {
                              ...metadata,
                              line: i + 1,
                              ...additionalMetadata
                          }
            })
        })
    }

    static async imports(): Promise<{
        readFile: typeof ReadFileT
    }> {
        try {
            const { readFile } = await import('node:fs/promises')
            return { readFile }
        } catch (e) {
            console.error(e)
            throw new Error(`Failed to load fs/promises. Make sure you are running in Node.js environment.`)
        }
    }
}

class JSONLinesLoader extends TextLoader {
    metadata?: ICommonObject
    additionalMetadata: ICommonObject[] = []

    constructor(filePathOrBlob: string | Blob, public pointer: string, metadata?: any) {
        super(filePathOrBlob)
        if (metadata) {
            this.metadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
        }
    }

    async getAdditionalMetadata(): Promise<ICommonObject[]> {
        return this.additionalMetadata
    }

    protected async parse(raw: string): Promise<{ pageContent: string; metadata: ICommonObject }[]> {
        const lines = raw.split('\n')
        const jsons = lines
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        const pointer = jsonpointer.compile(this.pointer)
        if (this.metadata) {
            const values = Object.values(this.metadata).filter((value) => typeof value === 'string' && value.startsWith('/'))
            let newJsons = []
            for (const json of jsons) {
                let metadata = {}
                for (const value of values) {
                    if (value) {
                        const key = Object.keys(this.metadata).find((key) => this.metadata?.[key] === value)
                        if (key) {
                            metadata = {
                                ...metadata,
                                [key]: jsonpointer.get(json, value)
                            }
                        }
                    }
                }
                newJsons.push({ pageContent: pointer.get(json), metadata })
            }
            return newJsons
        }
        return jsons.map((json) => {
            return { pageContent: pointer.get(json), metadata: {} }
        })
    }
}

module.exports = { nodeClass: Jsonlines_DocumentLoaders }
