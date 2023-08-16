import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { JSONLoader } from 'langchain/document_loaders/fs/json'
import { CSVLoader } from 'langchain/document_loaders/fs/csv'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'

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
        this.version = 1.0
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
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const folderPath = nodeData.inputs?.folderPath as string
        const metadata = nodeData.inputs?.metadata

        const loader = new DirectoryLoader(folderPath, {
            '.json': (path) => new JSONLoader(path),
            '.txt': (path) => new TextLoader(path),
            '.csv': (path) => new CSVLoader(path),
            '.docx': (path) => new DocxLoader(path),
            // @ts-ignore
            '.pdf': (path) => new PDFLoader(path, { pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') }),
            '.aspx': (path) => new TextLoader(path),
            '.asp': (path) => new TextLoader(path),
            '.cpp': (path) => new TextLoader(path), // C++
            '.c': (path) => new TextLoader(path),
            '.cs': (path) => new TextLoader(path),
            '.css': (path) => new TextLoader(path),
            '.go': (path) => new TextLoader(path), // Go
            '.h': (path) => new TextLoader(path), // C++ Header files
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
        })
        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
            for (const doc of docs) {
                const newdoc = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
                finaldocs.push(newdoc)
            }
            return finaldocs
        }

        return docs
    }
}

module.exports = { nodeClass: Folder_DocumentLoaders }
