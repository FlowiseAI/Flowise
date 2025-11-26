import { z } from 'zod'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'

export const desc = `Use this when you want to access Google Sheets API for managing spreadsheets and values`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    headers?: Headers
    body?: Body
    url?: string
    description?: string
    name?: string
    actions?: string[]
    accessToken?: string
    defaultParams?: any
}

// Define schemas for different Google Sheets operations

// Spreadsheet Schemas
const CreateSpreadsheetSchema = z.object({
    title: z.string().describe('The title of the spreadsheet'),
    sheetCount: z.number().optional().default(1).describe('Number of sheets to create'),
    locale: z.string().optional().describe('The locale of the spreadsheet (e.g., en_US)'),
    timeZone: z.string().optional().describe('The time zone of the spreadsheet (e.g., America/New_York)')
})

const GetSpreadsheetSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to retrieve'),
    ranges: z.string().optional().describe('Comma-separated list of ranges to retrieve'),
    includeGridData: z.boolean().optional().default(false).describe('True if grid data should be returned')
})

const UpdateSpreadsheetSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to update'),
    title: z.string().optional().describe('New title for the spreadsheet'),
    locale: z.string().optional().describe('New locale for the spreadsheet'),
    timeZone: z.string().optional().describe('New time zone for the spreadsheet')
})

// Values Schemas
const GetValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    range: z.string().describe('The A1 notation of the range to retrieve values from'),
    valueRenderOption: z
        .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
        .optional()
        .default('FORMATTED_VALUE')
        .describe('How values should be represented'),
    dateTimeRenderOption: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .default('FORMATTED_STRING')
        .describe('How dates should be represented'),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().default('ROWS').describe('The major dimension that results should use')
})

const UpdateValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    range: z.string().describe('The A1 notation of the range to update'),
    values: z.string().describe('JSON array of values to write (e.g., [["A1", "B1"], ["A2", "B2"]])'),
    valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional().default('USER_ENTERED').describe('How input data should be interpreted'),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().default('ROWS').describe('The major dimension of the values')
})

const AppendValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    range: z.string().describe('The A1 notation of the range to append to'),
    values: z.string().describe('JSON array of values to append'),
    valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional().default('USER_ENTERED').describe('How input data should be interpreted'),
    insertDataOption: z.enum(['OVERWRITE', 'INSERT_ROWS']).optional().default('OVERWRITE').describe('How data should be inserted'),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().default('ROWS').describe('The major dimension of the values')
})

const ClearValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    range: z.string().describe('The A1 notation of the range to clear')
})

const BatchGetValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    ranges: z.string().describe('Comma-separated list of ranges to retrieve'),
    valueRenderOption: z
        .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
        .optional()
        .default('FORMATTED_VALUE')
        .describe('How values should be represented'),
    dateTimeRenderOption: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .default('FORMATTED_STRING')
        .describe('How dates should be represented'),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().default('ROWS').describe('The major dimension that results should use')
})

const BatchUpdateValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional().default('USER_ENTERED').describe('How input data should be interpreted'),
    values: z
        .string()
        .describe('JSON array of value ranges to update (e.g., [{"range": "A1:B2", "values": [["A1", "B1"], ["A2", "B2"]]}])'),
    includeValuesInResponse: z.boolean().optional().default(false).describe('Whether to return the updated values in the response')
})

const BatchClearValuesSchema = z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    ranges: z.string().describe('Comma-separated list of ranges to clear')
})

class BaseGoogleSheetsTool extends DynamicStructuredTool {
    protected accessToken: string = ''

    constructor(args: any) {
        super(args)
        this.accessToken = args.accessToken ?? ''
    }

    async makeGoogleSheetsRequest({
        endpoint,
        method = 'GET',
        body,
        params
    }: {
        endpoint: string
        method?: string
        body?: any
        params?: any
    }): Promise<string> {
        const url = `https://sheets.googleapis.com/v4/${endpoint}`

        const headers = {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.headers
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Google Sheets API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }
}

// Spreadsheet Tools
class CreateSpreadsheetTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_spreadsheet',
            description: 'Create a new Google Spreadsheet',
            schema: CreateSpreadsheetSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const body: any = {
                properties: {
                    title: params.title
                }
            }

            if (params.locale) body.properties.locale = params.locale
            if (params.timeZone) body.properties.timeZone = params.timeZone

            // Add sheets if specified
            if (params.sheetCount && params.sheetCount > 1) {
                body.sheets = []
                for (let i = 0; i < params.sheetCount; i++) {
                    body.sheets.push({
                        properties: {
                            title: i === 0 ? 'Sheet1' : `Sheet${i + 1}`
                        }
                    })
                }
            }

            return await this.makeGoogleSheetsRequest({
                endpoint: 'spreadsheets',
                method: 'POST',
                body,
                params
            })
        } catch (error) {
            return formatToolError(`Error creating spreadsheet: ${error}`, params)
        }
    }
}

class GetSpreadsheetTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_spreadsheet',
            description: 'Get a Google Spreadsheet by ID',
            schema: GetSpreadsheetSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()

            if (params.ranges) {
                params.ranges.split(',').forEach((range: string) => {
                    queryParams.append('ranges', range.trim())
                })
            }
            if (params.includeGridData) queryParams.append('includeGridData', 'true')

            const queryString = queryParams.toString()
            const endpoint = `spreadsheets/${params.spreadsheetId}${queryString ? `?${queryString}` : ''}`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'GET',
                params
            })
        } catch (error) {
            return formatToolError(`Error getting spreadsheet: ${error}`, params)
        }
    }
}

class UpdateSpreadsheetTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_spreadsheet',
            description: 'Update a Google Spreadsheet properties',
            schema: UpdateSpreadsheetSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const requests = []
            if (params.title || params.locale || params.timeZone) {
                const updateProperties: any = {}
                if (params.title) updateProperties.title = params.title
                if (params.locale) updateProperties.locale = params.locale
                if (params.timeZone) updateProperties.timeZone = params.timeZone

                requests.push({
                    updateSpreadsheetProperties: {
                        properties: updateProperties,
                        fields: Object.keys(updateProperties).join(',')
                    }
                })
            }

            const body = { requests }

            return await this.makeGoogleSheetsRequest({
                endpoint: `spreadsheets/${params.spreadsheetId}:batchUpdate`,
                method: 'POST',
                body,
                params
            })
        } catch (error) {
            return formatToolError(`Error updating spreadsheet: ${error}`, params)
        }
    }
}

// Values Tools
class GetValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_values',
            description: 'Get values from a Google Spreadsheet range',
            schema: GetValuesSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()

            if (params.valueRenderOption) queryParams.append('valueRenderOption', params.valueRenderOption)
            if (params.dateTimeRenderOption) queryParams.append('dateTimeRenderOption', params.dateTimeRenderOption)
            if (params.majorDimension) queryParams.append('majorDimension', params.majorDimension)

            const queryString = queryParams.toString()
            const encodedRange = encodeURIComponent(params.range)
            const endpoint = `spreadsheets/${params.spreadsheetId}/values/${encodedRange}${queryString ? `?${queryString}` : ''}`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'GET',
                params
            })
        } catch (error) {
            return formatToolError(`Error getting values: ${error}`, params)
        }
    }
}

class UpdateValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_values',
            description: 'Update values in a Google Spreadsheet range',
            schema: UpdateValuesSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            let values
            try {
                values = JSON.parse(params.values)
            } catch (error) {
                throw new Error('Values must be a valid JSON array')
            }

            const body = {
                values,
                majorDimension: params.majorDimension || 'ROWS'
            }

            const queryParams = new URLSearchParams()
            queryParams.append('valueInputOption', params.valueInputOption || 'USER_ENTERED')

            const encodedRange = encodeURIComponent(params.range)
            const endpoint = `spreadsheets/${params.spreadsheetId}/values/${encodedRange}?${queryParams.toString()}`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'PUT',
                body,
                params
            })
        } catch (error) {
            return formatToolError(`Error updating values: ${error}`, params)
        }
    }
}

class AppendValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'append_values',
            description: 'Append values to a Google Spreadsheet range',
            schema: AppendValuesSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            let values
            try {
                values = JSON.parse(params.values)
            } catch (error) {
                throw new Error('Values must be a valid JSON array')
            }

            const body = {
                values,
                majorDimension: params.majorDimension || 'ROWS'
            }

            const queryParams = new URLSearchParams()
            queryParams.append('valueInputOption', params.valueInputOption || 'USER_ENTERED')
            queryParams.append('insertDataOption', params.insertDataOption || 'OVERWRITE')

            const encodedRange = encodeURIComponent(params.range)
            const endpoint = `spreadsheets/${params.spreadsheetId}/values/${encodedRange}:append?${queryParams.toString()}`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'POST',
                body,
                params
            })
        } catch (error) {
            return formatToolError(`Error appending values: ${error}`, params)
        }
    }
}

class ClearValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'clear_values',
            description: 'Clear values from a Google Spreadsheet range',
            schema: ClearValuesSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const encodedRange = encodeURIComponent(params.range)
            const endpoint = `spreadsheets/${params.spreadsheetId}/values/${encodedRange}:clear`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'POST',
                body: {},
                params
            })
        } catch (error) {
            return formatToolError(`Error clearing values: ${error}`, params)
        }
    }
}

class BatchGetValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'batch_get_values',
            description: 'Get values from multiple Google Spreadsheet ranges',
            schema: BatchGetValuesSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()

            // Add ranges
            params.ranges.split(',').forEach((range: string) => {
                queryParams.append('ranges', range.trim())
            })

            if (params.valueRenderOption) queryParams.append('valueRenderOption', params.valueRenderOption)
            if (params.dateTimeRenderOption) queryParams.append('dateTimeRenderOption', params.dateTimeRenderOption)
            if (params.majorDimension) queryParams.append('majorDimension', params.majorDimension)

            const endpoint = `spreadsheets/${params.spreadsheetId}/values:batchGet?${queryParams.toString()}`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'GET',
                params
            })
        } catch (error) {
            return formatToolError(`Error batch getting values: ${error}`, params)
        }
    }
}

class BatchUpdateValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'batch_update_values',
            description: 'Update values in multiple Google Spreadsheet ranges',
            schema: BatchUpdateValuesSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            let valueRanges
            try {
                valueRanges = JSON.parse(params.values)
            } catch (error) {
                throw new Error('Values must be a valid JSON array of value ranges')
            }

            const body = {
                valueInputOption: params.valueInputOption || 'USER_ENTERED',
                data: valueRanges,
                includeValuesInResponse: params.includeValuesInResponse || false
            }

            const endpoint = `spreadsheets/${params.spreadsheetId}/values:batchUpdate`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'POST',
                body,
                params
            })
        } catch (error) {
            return formatToolError(`Error batch updating values: ${error}`, params)
        }
    }
}

class BatchClearValuesTool extends BaseGoogleSheetsTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'batch_clear_values',
            description: 'Clear values from multiple Google Spreadsheet ranges',
            schema: BatchClearValuesSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const ranges = params.ranges.split(',').map((range: string) => range.trim())
            const body = { ranges }

            const endpoint = `spreadsheets/${params.spreadsheetId}/values:batchClear`

            return await this.makeGoogleSheetsRequest({
                endpoint,
                method: 'POST',
                body,
                params
            })
        } catch (error) {
            return formatToolError(`Error batch clearing values: ${error}`, params)
        }
    }
}

export const createGoogleSheetsTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const { actions = [], accessToken, defaultParams } = args || {}
    const tools: DynamicStructuredTool[] = []

    // Define all available tools
    const toolClasses = {
        // Spreadsheet tools
        createSpreadsheet: CreateSpreadsheetTool,
        getSpreadsheet: GetSpreadsheetTool,
        updateSpreadsheet: UpdateSpreadsheetTool,
        // Values tools
        getValues: GetValuesTool,
        updateValues: UpdateValuesTool,
        appendValues: AppendValuesTool,
        clearValues: ClearValuesTool,
        batchGetValues: BatchGetValuesTool,
        batchUpdateValues: BatchUpdateValuesTool,
        batchClearValues: BatchClearValuesTool
    }

    // Create tools based on requested actions
    actions.forEach((action) => {
        const ToolClass = toolClasses[action as keyof typeof toolClasses]
        if (ToolClass) {
            tools.push(new ToolClass({ accessToken, defaultParams }))
        }
    })

    return tools
}
