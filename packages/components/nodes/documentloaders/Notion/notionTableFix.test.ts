import { applyCompactTableTransformer } from './notionTableFix'

/**
 * Creates a mock NotionAPILoader with fake n2mClient and notionClient.
 * The n2mClient.blockToMarkdown mock converts rich_text cells to their plain_text,
 * mimicking the real notion-to-md behavior (which appends trailing newlines).
 */
function createMockLoader(tableRows: MockTableRow[]) {
    let capturedTransformer: ((block: Record<string, unknown>) => Promise<string>) | null = null

    const mockNotionClient = {
        blocks: {
            children: {
                list: jest.fn().mockResolvedValue({
                    results: tableRows.map((row) => ({
                        type: 'table_row',
                        table_row: { cells: row.cells }
                    })),
                    has_more: false,
                    next_cursor: null
                })
            }
        }
    }

    const mockN2m = {
        setCustomTransformer: jest.fn((type: string, transformer: typeof capturedTransformer) => {
            if (type === 'table') {
                capturedTransformer = transformer
            }
        }),
        blockToMarkdown: jest.fn(async (block: { paragraph: { rich_text: MockRichText[] } }) => {
            // Simulate notion-to-md behavior: join plain_text with trailing newlines
            const text = block.paragraph.rich_text.map((rt: MockRichText) => rt.plain_text).join('')
            return text + '\n\n'
        })
    }

    const loader = {
        n2mClient: mockN2m,
        notionClient: mockNotionClient
    }

    return {
        loader,
        mockNotionClient,
        mockN2m,
        getTransformer: () => capturedTransformer
    }
}

interface MockRichText {
    type: string
    plain_text: string
}

interface MockTableRow {
    cells: MockRichText[][]
}

function richText(text: string): MockRichText[] {
    return [{ type: 'text', plain_text: text }]
}

function createTableBlock(options: { has_children: boolean; has_column_header: boolean }) {
    return {
        id: 'block-id',
        type: 'table',
        has_children: options.has_children,
        table: {
            has_column_header: options.has_column_header,
            has_row_header: false,
            table_width: 3
        }
    }
}

describe('applyCompactTableTransformer', () => {
    it('registers a custom transformer for the table block type', () => {
        const { loader, mockN2m } = createMockLoader([])
        applyCompactTableTransformer(loader as never)
        expect(mockN2m.setCustomTransformer).toHaveBeenCalledWith('table', expect.any(Function))
    })

    it('returns empty string when block has no children', async () => {
        const { loader, getTransformer } = createMockLoader([])
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: false, has_column_header: true }))
        expect(result).toBe('')
    })

    it('returns empty string when API returns no rows', async () => {
        const { loader, getTransformer } = createMockLoader([])
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))
        expect(result).toBe('')
    })

    it('produces a compact markdown table with column header', async () => {
        const rows: MockTableRow[] = [
            { cells: [richText('Item'), richText('Price'), richText('Stock')] },
            { cells: [richText('Apple'), richText('$1.00'), richText('50')] },
            { cells: [richText('Banana'), richText('$0.50'), richText('100')] }
        ]
        const { loader, getTransformer } = createMockLoader(rows)
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        expect(result).toBe(
            '| Item | Price | Stock |\n' + '| --- | --- | --- |\n' + '| Apple | $1.00 | 50 |\n' + '| Banana | $0.50 | 100 |'
        )
    })

    it('generates blank header row when has_column_header is false', async () => {
        const rows: MockTableRow[] = [{ cells: [richText('Apple'), richText('$1.00')] }, { cells: [richText('Banana'), richText('$0.50')] }]
        const { loader, getTransformer } = createMockLoader(rows)
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: false }))

        expect(result).toBe('|  |  |\n' + '| --- | --- |\n' + '| Apple | $1.00 |\n' + '| Banana | $0.50 |')
    })

    it('trims trailing newlines from blockToMarkdown output', async () => {
        const rows: MockTableRow[] = [{ cells: [richText('Header')] }, { cells: [richText('Value')] }]
        const { loader, getTransformer, mockN2m } = createMockLoader(rows)

        // Override to add extra newlines as notion-to-md does
        mockN2m.blockToMarkdown.mockImplementation(async (block: { paragraph: { rich_text: MockRichText[] } }) => {
            const text = block.paragraph.rich_text.map((rt: MockRichText) => rt.plain_text).join('')
            return text + '\n\n\n'
        })

        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        expect(result).toBe('| Header |\n| --- |\n| Value |')
    })

    it('escapes pipe characters in cell content', async () => {
        const rows: MockTableRow[] = [{ cells: [richText('Header')] }, { cells: [richText('a|b|c')] }]
        const { loader, getTransformer } = createMockLoader(rows)
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        expect(result).toBe('| Header |\n| --- |\n| a\\|b\\|c |')
    })

    it('escapes backslash characters in cell content', async () => {
        const rows: MockTableRow[] = [{ cells: [richText('Path')] }, { cells: [richText('C:\\Users\\file')] }]
        const { loader, getTransformer } = createMockLoader(rows)
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        expect(result).toBe('| Path |\n| --- |\n| C:\\\\Users\\\\file |')
    })

    it('replaces internal newlines with spaces', async () => {
        const rows: MockTableRow[] = [{ cells: [richText('Header')] }, { cells: [richText('line1')] }]
        const { loader, getTransformer, mockN2m } = createMockLoader(rows)

        mockN2m.blockToMarkdown.mockImplementation(async (block: { paragraph: { rich_text: MockRichText[] } }) => {
            const text = block.paragraph.rich_text.map((rt: MockRichText) => rt.plain_text).join('')
            // Simulate content with internal newlines
            return text === 'line1' ? 'line1\nline2\n\n' : text + '\n\n'
        })

        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        expect(result).toBe('| Header |\n| --- |\n| line1 line2 |')
    })

    it('handles tables with long URLs without adding padding', async () => {
        const rows: MockTableRow[] = [
            { cells: [richText('Item'), richText('URL')] },
            { cells: [richText('Chatflows'), richText('https://flowiseai.com')] },
            { cells: [richText('Docs'), richText('https://github.com/FlowiseAI/Flowise')] }
        ]
        const { loader, getTransformer } = createMockLoader(rows)
        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        // Verify no extra spaces — each cell should be trimmed tightly
        const lines = result.split('\n')
        expect(lines[0]).toBe('| Item | URL |')
        expect(lines[1]).toBe('| --- | --- |')
        expect(lines[2]).toBe('| Chatflows | https://flowiseai.com |')
        expect(lines[3]).toBe('| Docs | https://github.com/FlowiseAI/Flowise |')
    })

    it('falls back to default handler when an error occurs', async () => {
        const { loader, getTransformer, mockNotionClient } = createMockLoader([])

        // Simulate an API error
        mockNotionClient.blocks.children.list.mockRejectedValueOnce(new Error('API rate limited'))

        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        // Returning false tells notion-to-md to use the default table handler
        expect(result).toBe(false)
    })

    it('handles pagination when fetching child blocks', async () => {
        const page1Rows: MockTableRow[] = [{ cells: [richText('Header')] }]
        const page2Rows: MockTableRow[] = [{ cells: [richText('Row1')] }]

        const { loader, getTransformer, mockNotionClient } = createMockLoader([])

        // Override to simulate paginated responses
        mockNotionClient.blocks.children.list
            .mockResolvedValueOnce({
                results: [{ type: 'table_row', table_row: { cells: page1Rows[0].cells } }],
                has_more: true,
                next_cursor: 'cursor-abc'
            })
            .mockResolvedValueOnce({
                results: [{ type: 'table_row', table_row: { cells: page2Rows[0].cells } }],
                has_more: false,
                next_cursor: null
            })

        applyCompactTableTransformer(loader as never)

        const transformer = getTransformer()!
        const result = await transformer(createTableBlock({ has_children: true, has_column_header: true }))

        expect(mockNotionClient.blocks.children.list).toHaveBeenCalledTimes(2)
        expect(result).toBe('| Header |\n| --- |\n| Row1 |')
    })
})
