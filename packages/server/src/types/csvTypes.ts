/**
 * TypeScript type definitions for CSV processing functionality
 * Provides type safety and validation interfaces for CSV configuration objects
 */

import { ICommonObject } from 'flowise-components'

/**
 * Configuration object for CSV processing runs
 * Defines the structure and behavior of CSV parsing operations
 */
export interface CsvConfiguration {
    /** User-provided context or instructions for AI processing */
    context?: string

    /** Whether the first row of the CSV contains column headers */
    firstRowIsHeaders: boolean

    /** Column headers detected or generated from CSV */
    headers: string[]

    /** Total number of rows in the original CSV (excluding headers if firstRowIsHeaders=true) */
    rowsCount: number

    /** Mapping of column indices to column names for selected columns */
    sourceColumns: Record<string, string>
}

/**
 * Configuration validation result with safety guarantees
 */
export interface SafeCsvConfiguration {
    /** Validated configuration object */
    config: CsvConfiguration

    /** Validation warnings (non-blocking issues) */
    warnings: string[]

    /** Number of valid source columns */
    validColumnCount: number

    /** Maximum rows available for processing */
    maxAvailableRows: number
}

/**
 * Enhanced interface that extends the base IAppCsvParseRuns with typed configuration
 */
export interface TypedCsvParseRun {
    id: string
    userId: string
    organizationId: string
    startedAt: Date
    completedAt?: Date
    rowsRequested: number
    rowsProcessed?: number
    name: string
    configuration: CsvConfiguration
    originalCsvUrl: string
    processedCsvUrl?: string
    chatflowChatId: string
    includeOriginalColumns: boolean
    status: string
    errorMessages: string[]
}

/**
 * Type guard to check if an object is a valid CsvConfiguration
 */
export function isCsvConfiguration(obj: any): obj is CsvConfiguration {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.firstRowIsHeaders === 'boolean' &&
        Array.isArray(obj.headers) &&
        obj.headers.every((header: any) => typeof header === 'string') &&
        typeof obj.rowsCount === 'number' &&
        obj.rowsCount >= 0 &&
        obj.sourceColumns &&
        typeof obj.sourceColumns === 'object' &&
        Object.keys(obj.sourceColumns).every((key) => !isNaN(Number(key))) &&
        Object.values(obj.sourceColumns).every((value) => typeof value === 'string') &&
        (obj.context === undefined || typeof obj.context === 'string')
    )
}

/**
 * Validates that source columns exist in the provided headers
 */
export function validateSourceColumns(
    sourceColumns: Record<string, string>,
    headers: string[]
): {
    validColumns: Record<string, string>
    invalidColumns: string[]
} {
    const validColumns: Record<string, string> = {}
    const invalidColumns: string[] = []

    Object.entries(sourceColumns).forEach(([index, columnName]) => {
        const colIndex = parseInt(index, 10)

        // Check if index is valid and column exists in headers
        if (!isNaN(colIndex) && colIndex >= 0 && colIndex < headers.length && headers[colIndex] === columnName) {
            validColumns[index] = columnName
        } else {
            invalidColumns.push(columnName)
        }
    })

    return { validColumns, invalidColumns }
}

/**
 * Safely extracts and validates CSV configuration from unknown object
 */
export function safeParseCsvConfiguration(configObject: ICommonObject | Record<string, unknown>): {
    config: CsvConfiguration | null
    errors: string[]
} {
    const errors: string[] = []

    if (!configObject || typeof configObject !== 'object') {
        errors.push('Configuration object is missing or invalid')
        return { config: null, errors }
    }

    // Validate firstRowIsHeaders
    if (typeof configObject.firstRowIsHeaders !== 'boolean') {
        errors.push('firstRowIsHeaders must be a boolean value')
    }

    // Validate headers
    if (!Array.isArray(configObject.headers)) {
        errors.push('headers must be an array of strings')
    } else if (!configObject.headers.every((header: any) => typeof header === 'string')) {
        errors.push('All headers must be strings')
    }

    // Validate rowsCount
    if (typeof configObject.rowsCount !== 'number' || configObject.rowsCount < 0) {
        errors.push('rowsCount must be a non-negative number')
    }

    // Validate sourceColumns
    if (!configObject.sourceColumns || typeof configObject.sourceColumns !== 'object') {
        errors.push('sourceColumns must be an object')
    } else {
        const sourceColumnsValid =
            Object.keys(configObject.sourceColumns).every((key) => !isNaN(Number(key))) &&
            Object.values(configObject.sourceColumns).every((value) => typeof value === 'string')
        if (!sourceColumnsValid) {
            errors.push('sourceColumns must be a mapping of numeric indices to string column names')
        }
    }

    // Validate context (optional)
    if (configObject.context !== undefined && typeof configObject.context !== 'string') {
        errors.push('context must be a string if provided')
    }

    if (errors.length > 0) {
        return { config: null, errors }
    }

    return {
        config: {
            firstRowIsHeaders: configObject.firstRowIsHeaders,
            headers: configObject.headers,
            rowsCount: configObject.rowsCount,
            sourceColumns: configObject.sourceColumns,
            context: configObject.context
        },
        errors: []
    }
}

/**
 * Validates row requests against available data rows
 * Note: totalRows parameter represents data rows only (headers already excluded by frontend parsing)
 */
export function validateRowsRequested(
    rowsRequested: number,
    totalRows: number,
    firstRowIsHeaders: boolean // eslint-disable-line @typescript-eslint/no-unused-vars
): {
    isValid: boolean
    maxAllowed: number
    error?: string
} {
    const availableDataRows = totalRows // totalRows already represents data rows from frontend parsing

    if (rowsRequested <= 0) {
        return {
            isValid: false,
            maxAllowed: availableDataRows,
            error: 'Must request at least 1 row'
        }
    }

    if (rowsRequested > availableDataRows) {
        return {
            isValid: false,
            maxAllowed: availableDataRows,
            error: `Cannot request more rows (${rowsRequested}) than available data rows (${availableDataRows})`
        }
    }

    return {
        isValid: true,
        maxAllowed: availableDataRows
    }
}

/**
 * Request body interface for creating CSV parse runs
 * Provides type safety for API endpoints
 */
export interface CreateCsvParseRunRequest {
    /** Name for the CSV processing run */
    name: string

    /** Configuration object containing CSV processing settings */
    configuration: CsvConfiguration

    /** ID of the chatflow to use for processing */
    chatflowChatId: string

    /** Number of rows to process */
    rowsRequested: number

    /** Base64-encoded CSV file data (optional if csvParseRunId provided) */
    file?: string

    /** Whether to include original columns in output */
    includeOriginalColumns: boolean

    /** ID of existing CSV parse run to clone from (optional if file provided) */
    csvParseRunId?: string
}

/**
 * Type guard to validate CreateCsvParseRunRequest objects
 */
export function isCreateCsvParseRunRequest(obj: any): obj is CreateCsvParseRunRequest {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.name === 'string' &&
        obj.name.trim().length > 0 &&
        isCsvConfiguration(obj.configuration) &&
        typeof obj.chatflowChatId === 'string' &&
        obj.chatflowChatId.trim().length > 0 &&
        typeof obj.rowsRequested === 'number' &&
        obj.rowsRequested > 0 &&
        typeof obj.includeOriginalColumns === 'boolean' &&
        (obj.file === undefined || typeof obj.file === 'string') &&
        (obj.csvParseRunId === undefined || typeof obj.csvParseRunId === 'string') &&
        (obj.file !== undefined || obj.csvParseRunId !== undefined) // At least one must be provided
    )
}

/**
 * Validates and safely parses a CreateCsvParseRunRequest
 */
export function validateCreateCsvParseRunRequest(body: any): {
    request: CreateCsvParseRunRequest | null
    errors: string[]
} {
    const errors: string[] = []

    if (!body || typeof body !== 'object') {
        errors.push('Request body is required and must be an object')
        return { request: null, errors }
    }

    // Validate name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        errors.push('name is required and must be a non-empty string')
    }

    // Validate configuration using existing function
    const { config, errors: configErrors } = safeParseCsvConfiguration(body.configuration)
    if (configErrors.length > 0) {
        errors.push(...configErrors.map((err) => `configuration.${err}`))
    }

    // Validate chatflowChatId
    if (!body.chatflowChatId || typeof body.chatflowChatId !== 'string' || body.chatflowChatId.trim().length === 0) {
        errors.push('chatflowChatId is required and must be a non-empty string')
    }

    // Validate rowsRequested
    if (typeof body.rowsRequested !== 'number' || body.rowsRequested <= 0) {
        errors.push('rowsRequested must be a positive number')
    }

    // Validate includeOriginalColumns
    if (typeof body.includeOriginalColumns !== 'boolean') {
        errors.push('includeOriginalColumns must be a boolean')
    }

    // Validate file and csvParseRunId
    const hasFile = body.file && typeof body.file === 'string'
    const hasCsvParseRunId = body.csvParseRunId && typeof body.csvParseRunId === 'string'

    if (!hasFile && !hasCsvParseRunId) {
        errors.push('Either file or csvParseRunId must be provided')
    }

    if (body.file !== undefined && typeof body.file !== 'string') {
        errors.push('file must be a string if provided')
    }

    if (body.csvParseRunId !== undefined && typeof body.csvParseRunId !== 'string') {
        errors.push('csvParseRunId must be a string if provided')
    }

    // Validate rowsRequested against configuration if available
    if (config && typeof body.rowsRequested === 'number') {
        const validation = validateRowsRequested(body.rowsRequested, config.rowsCount, config.firstRowIsHeaders)
        if (!validation.isValid) {
            errors.push(validation.error || 'Invalid rowsRequested value')
        }
    }

    if (errors.length > 0) {
        return { request: null, errors }
    }

    return {
        request: {
            name: body.name.trim(),
            configuration: config!,
            chatflowChatId: body.chatflowChatId.trim(),
            rowsRequested: body.rowsRequested,
            includeOriginalColumns: body.includeOriginalColumns,
            file: body.file,
            csvParseRunId: body.csvParseRunId
        },
        errors: []
    }
}
