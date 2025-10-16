import Papa from 'papaparse'

export interface ParsedCsvResult {
    headers: string[]
    rows: string[][]
}

/**
 * Generate consistent column name for CSV parsing
 * @param index - Zero-based column index
 * @returns Standardized column name (e.g., "Column 1", "Column 2")
 */
function generateColumnName(index: number): string {
    return `Column ${index + 1}`
}

/**
 * Parse CSV content using RFC 4180 compliant parser with headers
 */
export function parseCsvWithHeaders(input: string): ParsedCsvResult {
    return parseWithHeaders(input)
}

/**
 * Parse CSV content using RFC 4180 compliant parser without headers
 */
export function parseCsvWithoutHeaders(input: string): ParsedCsvResult {
    return parseWithoutHeaders(input)
}

/**
 * Parse CSV with headers
 */
function parseWithHeaders(input: string): ParsedCsvResult {
    const result = Papa.parse<Record<string, string>>(input.trim(), {
        header: true,
        skipEmptyLines: true,
        comments: '#',
        transformHeader: (header) => header.trim() // Clean up header names
    })

    // Be very lenient with errors - Papa Parse can handle most cases
    if (result.errors && result.errors.length > 0) {
        const criticalErrors = result.errors.filter(
            (e) => e.type === 'Quotes' && e.code === 'InvalidQuotes' // Only fail on malformed quotes
        )
        if (criticalErrors.length > 0) {
            const errorMessages = criticalErrors.slice(0, 3).map((e) => e.message || 'CSV parsing error')
            throw new Error(errorMessages.join('; '))
        }
        // Ignore delimiter detection warnings - Papa Parse handles this gracefully
    }

    const headers = result.meta.fields || []
    if (headers.length === 0) {
        throw new Error('CSV has no header row or headers could not be determined.')
    }

    // Filter out empty header names
    const cleanHeaders = headers.filter((header) => header && header.trim() !== '')
    if (cleanHeaders.length === 0) {
        throw new Error('CSV has no valid header names.')
    }

    const rowObjects = result.data || []
    if (rowObjects.length === 0) {
        throw new Error('CSV file has no data rows.')
    }

    const rows = rowObjects.map((obj) => cleanHeaders.map((k) => (obj[k] ?? '').toString()))

    // Be more lenient with column count mismatches
    const maxColumns = Math.max(...rows.map((r) => r.length), cleanHeaders.length)
    const normalizedRows = rows.map((row) => {
        while (row.length < maxColumns) {
            row.push('') // Pad with empty strings for missing columns
        }
        return row.slice(0, maxColumns) // Trim excess columns
    })

    return { headers: cleanHeaders, rows: normalizedRows }
}

/**
 * Parse CSV without headers
 */
function parseWithoutHeaders(input: string): ParsedCsvResult {
    const result = Papa.parse(input.trim(), {
        header: false,
        skipEmptyLines: true,
        comments: '#'
    })

    const rows = result.data as string[][]
    if (rows.length === 0) {
        throw new Error('CSV file has no data rows.')
    }

    // Detect actual CSV structure from the first row
    const firstRow = rows[0]
    if (!firstRow || firstRow.length === 0) {
        throw new Error('CSV file has no valid data in first row.')
    }

    // Create headers based on actual column count
    const headers = firstRow.map((_, index) => generateColumnName(index))

    return { headers, rows }
}
