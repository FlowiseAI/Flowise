import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src/utils'
import { createGoogleSheetsTools } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class GoogleSheets_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Sheets'
        this.name = 'googleSheetsTool'
        this.version = 1.0
        this.type = 'GoogleSheets'
        this.icon = 'google-sheets.svg'
        this.category = 'Tools'
        this.description = 'Perform Google Sheets operations such as managing spreadsheets, reading and writing values'
        this.baseClasses = ['Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleSheetsOAuth2']
        }
        this.inputs = [
            {
                label: 'Type',
                name: 'sheetsType',
                type: 'options',
                description: 'Type of Google Sheets operation',
                options: [
                    {
                        label: 'Spreadsheet',
                        name: 'spreadsheet'
                    },
                    {
                        label: 'Values',
                        name: 'values'
                    }
                ]
            },
            // Spreadsheet Actions
            {
                label: 'Spreadsheet Actions',
                name: 'spreadsheetActions',
                type: 'multiOptions',
                description: 'Actions to perform on spreadsheets',
                options: [
                    {
                        label: 'Create Spreadsheet',
                        name: 'createSpreadsheet'
                    },
                    {
                        label: 'Get Spreadsheet',
                        name: 'getSpreadsheet'
                    },
                    {
                        label: 'Update Spreadsheet',
                        name: 'updateSpreadsheet'
                    }
                ],
                show: {
                    sheetsType: ['spreadsheet']
                }
            },
            // Values Actions
            {
                label: 'Values Actions',
                name: 'valuesActions',
                type: 'multiOptions',
                description: 'Actions to perform on sheet values',
                options: [
                    {
                        label: 'Get Values',
                        name: 'getValues'
                    },
                    {
                        label: 'Update Values',
                        name: 'updateValues'
                    },
                    {
                        label: 'Append Values',
                        name: 'appendValues'
                    },
                    {
                        label: 'Clear Values',
                        name: 'clearValues'
                    },
                    {
                        label: 'Batch Get Values',
                        name: 'batchGetValues'
                    },
                    {
                        label: 'Batch Update Values',
                        name: 'batchUpdateValues'
                    },
                    {
                        label: 'Batch Clear Values',
                        name: 'batchClearValues'
                    }
                ],
                show: {
                    sheetsType: ['values']
                }
            },
            // Spreadsheet Parameters
            {
                label: 'Spreadsheet ID',
                name: 'spreadsheetId',
                type: 'string',
                description: 'The ID of the spreadsheet',
                show: {
                    sheetsType: ['spreadsheet', 'values']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Title',
                name: 'title',
                type: 'string',
                description: 'The title of the spreadsheet',
                show: {
                    spreadsheetActions: ['createSpreadsheet', 'updateSpreadsheet']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Sheet Count',
                name: 'sheetCount',
                type: 'number',
                description: 'Number of sheets to create',
                default: 1,
                show: {
                    spreadsheetActions: ['createSpreadsheet']
                },
                additionalParams: true,
                optional: true
            },
            // Values Parameters
            {
                label: 'Range',
                name: 'range',
                type: 'string',
                description: 'The range to read/write (e.g., A1:B2, Sheet1!A1:C10)',
                show: {
                    valuesActions: ['getValues', 'updateValues', 'clearValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Ranges',
                name: 'ranges',
                type: 'string',
                description: 'Comma-separated list of ranges for batch operations',
                show: {
                    valuesActions: ['batchGetValues', 'batchClearValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Values',
                name: 'values',
                type: 'string',
                description: 'JSON array of values to write (e.g., [["A1", "B1"], ["A2", "B2"]])',
                show: {
                    valuesActions: ['updateValues', 'appendValues', 'batchUpdateValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Value Input Option',
                name: 'valueInputOption',
                type: 'options',
                description: 'How input data should be interpreted',
                options: [
                    {
                        label: 'Raw',
                        name: 'RAW'
                    },
                    {
                        label: 'User Entered',
                        name: 'USER_ENTERED'
                    }
                ],
                default: 'USER_ENTERED',
                show: {
                    valuesActions: ['updateValues', 'appendValues', 'batchUpdateValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Value Render Option',
                name: 'valueRenderOption',
                type: 'options',
                description: 'How values should be represented in the output',
                options: [
                    {
                        label: 'Formatted Value',
                        name: 'FORMATTED_VALUE'
                    },
                    {
                        label: 'Unformatted Value',
                        name: 'UNFORMATTED_VALUE'
                    },
                    {
                        label: 'Formula',
                        name: 'FORMULA'
                    }
                ],
                default: 'FORMATTED_VALUE',
                show: {
                    valuesActions: ['getValues', 'batchGetValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Date Time Render Option',
                name: 'dateTimeRenderOption',
                type: 'options',
                description: 'How dates, times, and durations should be represented',
                options: [
                    {
                        label: 'Serial Number',
                        name: 'SERIAL_NUMBER'
                    },
                    {
                        label: 'Formatted String',
                        name: 'FORMATTED_STRING'
                    }
                ],
                default: 'FORMATTED_STRING',
                show: {
                    valuesActions: ['getValues', 'batchGetValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Insert Data Option',
                name: 'insertDataOption',
                type: 'options',
                description: 'How data should be inserted',
                options: [
                    {
                        label: 'Overwrite',
                        name: 'OVERWRITE'
                    },
                    {
                        label: 'Insert Rows',
                        name: 'INSERT_ROWS'
                    }
                ],
                default: 'OVERWRITE',
                show: {
                    valuesActions: ['appendValues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Include Grid Data',
                name: 'includeGridData',
                type: 'boolean',
                description: 'True if grid data should be returned',
                default: false,
                show: {
                    spreadsheetActions: ['getSpreadsheet']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Major Dimension',
                name: 'majorDimension',
                type: 'options',
                description: 'The major dimension that results should use',
                options: [
                    {
                        label: 'Rows',
                        name: 'ROWS'
                    },
                    {
                        label: 'Columns',
                        name: 'COLUMNS'
                    }
                ],
                default: 'ROWS',
                show: {
                    valuesActions: ['getValues', 'updateValues', 'appendValues', 'batchGetValues', 'batchUpdateValues']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const sheetsType = nodeData.inputs?.sheetsType as string

        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
        const accessToken = getCredentialParam('access_token', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        // Get all actions based on type
        let actions: string[] = []

        if (sheetsType === 'spreadsheet') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.spreadsheetActions)
        } else if (sheetsType === 'values') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.valuesActions)
        }

        const defaultParams = this.transformNodeInputsToToolArgs(nodeData)

        const tools = createGoogleSheetsTools({
            accessToken,
            actions,
            defaultParams
        })

        return tools
    }

    transformNodeInputsToToolArgs(nodeData: INodeData): Record<string, any> {
        // Collect default parameters from inputs
        const defaultParams: Record<string, any> = {}

        // Common parameters
        if (nodeData.inputs?.spreadsheetId) defaultParams.spreadsheetId = nodeData.inputs.spreadsheetId

        // Spreadsheet parameters
        if (nodeData.inputs?.title) defaultParams.title = nodeData.inputs.title
        if (nodeData.inputs?.sheetCount) defaultParams.sheetCount = nodeData.inputs.sheetCount
        if (nodeData.inputs?.includeGridData !== undefined) defaultParams.includeGridData = nodeData.inputs.includeGridData

        // Values parameters
        if (nodeData.inputs?.range) defaultParams.range = nodeData.inputs.range
        if (nodeData.inputs?.ranges) defaultParams.ranges = nodeData.inputs.ranges
        if (nodeData.inputs?.values) defaultParams.values = nodeData.inputs.values
        if (nodeData.inputs?.valueInputOption) defaultParams.valueInputOption = nodeData.inputs.valueInputOption
        if (nodeData.inputs?.valueRenderOption) defaultParams.valueRenderOption = nodeData.inputs.valueRenderOption
        if (nodeData.inputs?.dateTimeRenderOption) defaultParams.dateTimeRenderOption = nodeData.inputs.dateTimeRenderOption
        if (nodeData.inputs?.insertDataOption) defaultParams.insertDataOption = nodeData.inputs.insertDataOption
        if (nodeData.inputs?.majorDimension) defaultParams.majorDimension = nodeData.inputs.majorDimension

        return defaultParams
    }
}

module.exports = { nodeClass: GoogleSheets_Tools }
