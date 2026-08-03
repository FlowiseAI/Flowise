import type { Client } from '@notionhq/client'
import type { NotionToMarkdown } from 'notion-to-md'
import type { NotionAPILoader } from '@langchain/community/document_loaders/web/notionapi'

// ────────────────────────────────────────────────────────────────
// Local type definitions for the Notion API shapes we use.
// These types are only available via @notionhq/client/build/src/api-endpoints
// which is an internal path, so we define the minimal shapes here.
// ────────────────────────────────────────────────────────────────

interface TableBlock {
    id: string
    has_children: boolean
    table: {
        has_column_header: boolean
    }
}

interface TableRowBlock {
    type: 'table_row'
    table_row: {
        cells: RichText[][]
    }
}

interface RichText {
    type: string
    plain_text: string
    annotations: Record<string, unknown>
    href: string | null
}

interface BlockListResponse {
    results: Record<string, unknown>[]
    has_more: boolean
    next_cursor: string | null
}

/**
 * Provides typed access to the private fields of NotionAPILoader
 * that we need for applying the custom table transformer.
 */
interface NotionAPILoaderInternal {
    n2mClient: NotionToMarkdown
    notionClient: Client
}

/**
 * Overrides the default table block handler on a NotionAPILoader instance
 * to produce compact markdown tables without the excessive cell padding
 * added by the markdown-table library's default options.
 */
export function applyCompactTableTransformer(loader: NotionAPILoader): void {
    const internal = loader as unknown as NotionAPILoaderInternal
    const n2m = internal.n2mClient
    const notionClient = internal.notionClient

    n2m.setCustomTransformer('table', async (block) => {
        try {
            const tableBlock = block as unknown as TableBlock
            const { id, has_children } = tableBlock
            const { has_column_header } = tableBlock.table

            if (!has_children) return ''

            // Fetch all table row blocks using the public Notion API
            const childBlocks = await fetchAllChildBlocks(notionClient, id)

            // Convert each row's cells to markdown strings
            const tableArr: string[][] = []
            for (const child of childBlocks) {
                const row = child as unknown as TableRowBlock
                const cells: RichText[][] = row.table_row?.cells || []
                const cellStrings: string[] = []

                for (const cell of cells) {
                    const raw = await n2m.blockToMarkdown({
                        type: 'paragraph',
                        paragraph: { rich_text: cell }
                    } as Parameters<typeof n2m.blockToMarkdown>[0])
                    const cleaned = escapeForTable(raw)
                    cellStrings.push(cleaned)
                }

                tableArr.push(cellStrings)
            }

            if (tableArr.length === 0) return ''

            // Build the markdown table
            const columnCount = tableArr[0].length
            const headerArray = has_column_header ? tableArr[0] : new Array<string>(columnCount).fill('')
            const dataRows = has_column_header ? tableArr.slice(1) : tableArr

            const header = formatRow(headerArray)
            const separator = formatRow(new Array<string>(columnCount).fill('---'))
            const rows = dataRows.map(formatRow)

            return [header, separator, ...rows].join('\n')
        } catch {
            // Fall back to the default (padded) table handler rather than failing the entire load
            return false
        }
    })
}

/**
 * Fetches all child blocks for a given block ID, handling pagination.
 */
async function fetchAllChildBlocks(notionClient: Client, blockId: string): Promise<BlockListResponse['results']> {
    const blocks: BlockListResponse['results'] = []
    let cursor: string | undefined = undefined

    do {
        const response: BlockListResponse = await notionClient.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor
        })
        blocks.push(...response.results)
        cursor = response.has_more ? response.next_cursor ?? undefined : undefined
    } while (cursor)

    return blocks
}

/**
 * Cleans a blockToMarkdown result for use inside a table cell:
 * - Trims surrounding whitespace and trailing newlines
 * - Replaces internal newlines with spaces
 * - Escapes backslashes and pipes to preserve table structure
 */
function escapeForTable(raw: string): string {
    const trimmed = raw.trim()
    const singleLine = trimmed.replace(/\n/g, ' ')
    const escapedBackslashes = singleLine.replace(/\\/g, '\\\\')
    const escapedPipes = escapedBackslashes.replace(/\|/g, '\\|')
    return escapedPipes
}

/**
 * Formats an array of cell strings into a markdown table row.
 */
function formatRow(cells: string[]): string {
    return '| ' + cells.join(' | ') + ' |'
}
