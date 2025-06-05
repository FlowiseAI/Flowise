import { Document } from '@langchain/core/documents'
import { BufferLoader } from 'langchain/document_loaders/fs/buffer'
import { read, utils } from 'xlsx'

/**
 * Document loader that uses SheetJS to load documents.
 *
 * Each worksheet is parsed into an array of row objects using the SheetJS
 * `sheet_to_json` method and projected to a `Document`. Metadata includes
 * original sheet name, row data, and row index
 */
export class LoadOfSheet extends BufferLoader {
    attributes: { name: string; description: string; type: string }[] = []

    constructor(filePathOrBlob: string | Blob) {
        super(filePathOrBlob)
        this.attributes = []
    }

    /**
     * Parse document
     *
     * NOTE: column labels in multiple sheets are not disambiguated!
     *
     * @param raw Raw data Buffer
     * @param metadata Document metadata
     * @returns Array of Documents
     */
    async parse(raw: Buffer, metadata: Document['metadata']): Promise<Document[]> {
        const result: Document[] = []

        this.attributes = [
            { name: 'worksheet', description: 'Sheet or Worksheet Name', type: 'string' },
            { name: 'rowNum', description: 'Row index', type: 'number' }
        ]

        const wb = read(raw, { type: 'buffer' })
        for (let name of wb.SheetNames) {
            const fields: Record<string, Record<string, boolean>> = {}
            const ws = wb.Sheets[name]
            if (!ws) continue

            const aoo = utils.sheet_to_json(ws) as Record<string, unknown>[]
            aoo.forEach((row) => {
                result.push({
                    pageContent:
                        Object.entries(row)
                            .map((kv) => `- ${kv[0]}: ${kv[1]}`)
                            .join('\n') + '\n',
                    metadata: {
                        worksheet: name,
                        rowNum: row['__rowNum__'],
                        ...metadata,
                        ...row
                    }
                })
                Object.entries(row).forEach(([k, v]) => {
                    if (v != null) (fields[k] || (fields[k] = {}))[v instanceof Date ? 'date' : typeof v] = true
                })
            })
            Object.entries(fields).forEach(([k, v]) =>
                this.attributes.push({
                    name: k,
                    description: k,
                    type: Object.keys(v).join(' or ')
                })
            )
        }

        return result
    }
}
