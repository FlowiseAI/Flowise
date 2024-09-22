import { omit } from 'lodash'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { JSONLinesLoader, JSONLoader } from 'langchain/document_loaders/fs/json'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'

class Folder_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Folder with Files'
        this.name = 'folderFiles'
        this.version = 3.0
        this.type = 'Document'
        this.icon = 'folder.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from folder with multiple files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Folder Path',
                name: 'folderPath',
                type: 'string',
                placeholder: ''
            },
            {
                label: 'Recursive',
                name: 'recursive',
                type: 'boolean',
                additionalParams: false
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Pdf Usage',
                name: 'pdfUsage',
                type: 'options',
                description: 'Only when loading PDF files',
                options: [
                    {
                        label: 'One document per page',
                        name: 'perPage'
                    },
                    {
                        label: 'One document per file',
                        name: 'perFile'
                    }
                ],
                default: 'perPage',
                optional: true,
                additionalParams: true
            },
            {
                label: 'JSONL Pointer Extraction',
                name: 'pointerName',
                type: 'string',
                description: 'Only when loading JSONL files',
                placeholder: '<pointerName>',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
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
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const folderPath = nodeData.inputs?.folderPath as string
        const metadata = nodeData.inputs?.metadata
        const recursive = nodeData.inputs?.recursive as boolean
        const pdfUsage = nodeData.inputs?.pdfUsage
        const pointerName = nodeData.inputs?.pointerName as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const loader = new DirectoryLoader(
            folderPath,
            {
                '.json': (path) => new JSONLoader(path),
                '.jsonl': (blob) => new JSONLinesLoader(blob, '/' + pointerName.trim()),
                '.txt': (path) => new TextLoader(path),
                '.csv': (path) => new CSVLoader(path),
                '.xls': (path) => new CSVLoader(path),
                '.xlsx': (path) => new CSVLoader(path),
                '.doc': (path) => new DocxLoader(path),
                '.docx': (path) => new DocxLoader(path),
                '.pdf': (path) =>
                    pdfUsage === 'perFile'
                        ? // @ts-ignore
                          new PDFLoader(path, { splitPages: false, pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') })
                        : // @ts-ignore
                          new PDFLoader(path, { pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') }),
                '.aspx': (path) => new TextLoader(path),
                '.asp': (path) => new TextLoader(path),
                '.cpp': (path) => new TextLoader(path), // C++
                '.c': (path) => new TextLoader(path),
                '.cs': (path) => new TextLoader(path),
                '.css': (path) => new TextLoader(path),
                '.go': (path) => new TextLoader(path), // Go
                '.h': (path) => new TextLoader(path), // C++ Header files
                '.kt': (path) => new TextLoader(path), // Kotlin
                '.java': (path) => new TextLoader(path), // Java
                '.js': (path) => new TextLoader(path), // JavaScript
                '.less': (path) => new TextLoader(path), // Less files
                '.ts': (path) => new TextLoader(path), // TypeScript
                '.php': (path) => new TextLoader(path), // PHP
                '.proto': (path) => new TextLoader(path), // Protocol Buffers
                '.python': (path) => new TextLoader(path), // Python
                '.py': (path) => new TextLoader(path), // Python
                '.rst': (path) => new TextLoader(path), // reStructuredText
                '.ruby': (path) => new TextLoader(path), // Ruby
                '.rb': (path) => new TextLoader(path), // Ruby
                '.rs': (path) => new TextLoader(path), // Rust
                '.scala': (path) => new TextLoader(path), // Scala
                '.sc': (path) => new TextLoader(path), // Scala
                '.scss': (path) => new TextLoader(path), // Sass
                '.sol': (path) => new TextLoader(path), // Solidity
                '.sql': (path) => new TextLoader(path), //SQL
                '.swift': (path) => new TextLoader(path), // Swift
                '.markdown': (path) => new TextLoader(path), // Markdown
                '.md': (path) => new TextLoader(path), // Markdown
                '.tex': (path) => new TextLoader(path), // LaTeX
                '.ltx': (path) => new TextLoader(path), // LaTeX
                '.html': (path) => new TextLoader(path), // HTML
                '.vb': (path) => new TextLoader(path), // Visual Basic
                '.xml': (path) => new TextLoader(path) // XML
            },
            recursive
        )
        let docs = []

        if (textSplitter) {
            docs = await loader.load()
            docs = await textSplitter.splitDocuments(docs)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
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

        return docs
    }
}

module.exports = { nodeClass: Folder_DocumentLoaders }
