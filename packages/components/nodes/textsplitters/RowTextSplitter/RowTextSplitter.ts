import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { TextSplitter, TextSplitterParams } from '@langchain/textsplitters'

interface RowTextSplitterParams extends TextSplitterParams {
    lineSeparator: string
    trimWhitespace: boolean
    includeEmptyLines: boolean
}

class RowTextSplitter extends TextSplitter implements RowTextSplitterParams {
    static lc_name() {
        return 'RowTextSplitter'
    }

    lineSeparator: string
    trimWhitespace: boolean
    includeEmptyLines: boolean

    constructor(fields?: Partial<RowTextSplitterParams>) {
        super({
            ...fields,
            chunkSize: Number.MAX_SAFE_INTEGER,
            chunkOverlap: 0
        })
        this.lineSeparator = fields?.lineSeparator ?? '\n'
        this.trimWhitespace = fields?.trimWhitespace ?? true
        this.includeEmptyLines = fields?.includeEmptyLines ?? false
    }

    async splitText(text: string): Promise<string[]> {
        if (!text) return []

        const rawLines = this.lineSeparator === '\n' ? text.split(/\r?\n/) : text.split(this.lineSeparator)
        const lines: string[] = []

        for (const raw of rawLines) {
            const line = this.trimWhitespace ? raw.trim() : raw

            if (!this.includeEmptyLines && line.length === 0) {
                continue
            }

            lines.push(line)
        }

        return lines
    }
}

class RowTextSplitter_TextSplitters implements INode {
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
        this.label = 'Row Text Splitter'
        this.name = 'rowTextSplitter'
        this.version = 1.0
        this.type = 'RowTextSplitter'
        this.icon = 'rowTextSplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Splits text into individual rows/lines. Ideal for database table rows, CSV data, or line-based logs.`
        this.baseClasses = [this.type, ...getBaseClasses(RowTextSplitter)]
        this.inputs = [
            {
                label: 'Line Separator',
                name: 'lineSeparator',
                type: 'string',
                description: 'Character or string that separates rows. Defaults to newline (\\n).',
                placeholder: '\\n',
                optional: true
            },
            {
                label: 'Trim Whitespace',
                name: 'trimWhitespace',
                type: 'boolean',
                description: 'Trim whitespace from the start and end of each row.',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Include Empty Lines',
                name: 'includeEmptyLines',
                type: 'boolean',
                description: 'Whether to include empty lines as separate rows.',
                default: false,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const lineSeparatorInput = (nodeData.inputs?.lineSeparator as string) || ''
        const trimWhitespace = (nodeData.inputs?.trimWhitespace as boolean) ?? true
        const includeEmptyLines = (nodeData.inputs?.includeEmptyLines as boolean) ?? false

        const splitter = new RowTextSplitter({
            lineSeparator: this.normalizeSeparator(lineSeparatorInput),
            trimWhitespace,
            includeEmptyLines
        })

        return splitter
    }

    private normalizeSeparator(separator: string): string {
        if (!separator) return '\n'

        return separator.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    }
}

module.exports = { nodeClass: RowTextSplitter_TextSplitters }
