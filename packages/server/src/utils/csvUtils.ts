import { parse } from 'csv-parse/sync'
import logger from './logger'

/**
 * Generate consistent column name for CSV parsing
 * @param index - Zero-based column index
 * @returns Standardized column name (e.g., "Column 1", "Column 2")
 */
export function generateColumnName(index: number): string {
    return `Column ${index + 1}`
}

export interface CsvParseResult {
    records: Record<string, string>[]
    headers: string[]
}

/**
 * Parse CSV with headers approach
 * Attempts to use the first row as column headers
 * Matches frontend behavior with header cleaning and normalization
 */
function parseWithHeaders(csvText: string): CsvParseResult {
    const rawRecords = parse(csvText.trim(), {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        comment: '#',
        comment_no_infix: true
    })

    const processedRecords = rawRecords as Record<string, string>[]

    if (processedRecords.length === 0) {
        throw new Error('CSV file has no data rows')
    }

    // Extract and clean headers from the first record (matches frontend transformHeader behavior)
    const rawHeaders = Object.keys(processedRecords[0])
    const cleanHeaders = rawHeaders.map((header) => header.trim()).filter((header) => header !== '')

    if (cleanHeaders.length === 0) {
        throw new Error('CSV has no valid header names')
    }

    // Normalize records to only include clean headers and pad missing values
    const normalizedRecords = processedRecords.map((record) => {
        const normalizedRecord: Record<string, string> = {}
        cleanHeaders.forEach((header) => {
            // Find the original header key (before trimming)
            const originalKey = rawHeaders.find((key) => key.trim() === header) || header
            normalizedRecord[header] = (record[originalKey] ?? '').toString()
        })
        return normalizedRecord
    })

    return {
        records: normalizedRecords,
        headers: cleanHeaders
    }
}

/**
 * Parse CSV without headers approach
 * Creates generic column names: "Column 1", "Column 2", etc.
 * Matches frontend behavior with column normalization
 */
function parseWithoutHeaders(csvText: string): CsvParseResult {
    const rawRecords = parse(csvText.trim(), {
        columns: false, // Return arrays instead of objects
        skip_empty_lines: true,
        comment: '#',
        comment_no_infix: true
    })

    const arrayRecords = rawRecords as string[][]

    if (arrayRecords.length === 0) {
        throw new Error('CSV file has no data rows')
    }

    // Determine column count from the first row
    const firstRow = arrayRecords[0]
    if (!firstRow || firstRow.length === 0) {
        throw new Error('CSV file has no valid data in first row')
    }

    // Create generic headers: "Column 1", "Column 2", etc. (matches frontend exactly)
    const headers = firstRow.map((_, index) => generateColumnName(index))

    // Determine maximum column count from all rows for normalization
    const maxColumns = Math.max(...arrayRecords.map((row) => row.length), headers.length)

    // Create normalized headers if we found longer rows
    const normalizedHeaders = Array.from({ length: maxColumns }, (_, index) => generateColumnName(index))

    // Transform arrays into objects with normalized column structure (matches frontend)
    const processedRecords = arrayRecords.map((row: string[]) => {
        const obj: Record<string, string> = {}
        normalizedHeaders.forEach((header, colIndex) => {
            obj[header] = row[colIndex] || '' // Pad missing values with empty strings
        })
        return obj
    })

    return {
        records: processedRecords,
        headers: normalizedHeaders
    }
}

/**
 * Unified CSV parsing utility that respects user choice exactly
 * User-driven parsing: uses headers or no-headers based on user specification
 * No auto-fallback logic - respects firstRowIsHeaders parameter exactly
 *
 * @param csvText - Raw CSV content as string
 * @param firstRowIsHeaders - Whether to treat first row as headers (defaults to true for backward compatibility)
 * @returns Processed CSV records as objects with string keys and values
 */
export function parseCsvContent(csvText: string, firstRowIsHeaders: boolean = true): CsvParseResult {
    if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV text is required and must be a string')
    }

    try {
        if (firstRowIsHeaders) {
            // User specified headers - parse with headers
            const result = parseWithHeaders(csvText)
            logger.info(`CSV parsing completed with headers: ${result.records.length} rows, ${result.headers.length} columns`)
            return result
        } else {
            // User specified no headers - parse without headers
            const result = parseWithoutHeaders(csvText)
            logger.info(`CSV parsing completed without headers: ${result.records.length} rows, ${result.headers.length} columns`)
            return result
        }
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown CSV parsing error'
        logger.error('CSV parsing failed:', errorMessage)
        throw new Error(`Failed to parse CSV: ${errorMessage}`)
    }
}
