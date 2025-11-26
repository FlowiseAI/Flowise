import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { get } from 'lodash'

/**
 * Tool that extracts values from JSON using path
 */
class JSONPathExtractorTool extends StructuredTool {
    name = 'json_path_extractor'
    description = 'Extract value from JSON using configured path'

    schema = z.object({
        json: z
            .union([z.string().describe('JSON string'), z.record(z.any()).describe('JSON object'), z.array(z.any()).describe('JSON array')])
            .describe('JSON data to extract value from')
    })

    private readonly path: string
    private readonly returnNullOnError: boolean

    constructor(path: string, returnNullOnError: boolean = false) {
        super()
        this.path = path
        this.returnNullOnError = returnNullOnError
    }

    async _call({ json }: z.infer<typeof this.schema>): Promise<string> {
        // Validate that path is configured
        if (!this.path) {
            if (this.returnNullOnError) {
                return 'null'
            }
            throw new Error('No extraction path configured')
        }

        let data: any

        // Parse JSON string if needed
        if (typeof json === 'string') {
            try {
                data = JSON.parse(json)
            } catch (error) {
                if (this.returnNullOnError) {
                    return 'null'
                }
                throw new Error(`Invalid JSON string: ${error instanceof Error ? error.message : 'Parse error'}`)
            }
        } else {
            data = json
        }

        // Extract value using lodash get
        const value = get(data, this.path)

        if (value === undefined) {
            if (this.returnNullOnError) {
                return 'null'
            }
            const jsonPreview = JSON.stringify(data, null, 2)
            const preview = jsonPreview.length > 200 ? jsonPreview.substring(0, 200) + '...' : jsonPreview
            throw new Error(`Path "${this.path}" not found in JSON. Received: ${preview}`)
        }

        return typeof value === 'string' ? value : JSON.stringify(value)
    }
}

/**
 * Node implementation for JSON Path Extractor tool
 */
class JSONPathExtractor_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'JSON Path Extractor'
        this.name = 'jsonPathExtractor'
        this.version = 1.0
        this.type = 'JSONPathExtractor'
        this.icon = 'jsonpathextractor.svg'
        this.category = 'Tools'
        this.description = 'Extract values from JSON using path expressions'
        this.baseClasses = [this.type, ...getBaseClasses(JSONPathExtractorTool)]
        this.inputs = [
            {
                label: 'JSON Path',
                name: 'path',
                type: 'string',
                description: 'Path to extract. Examples: data, user.name, items[0].id',
                placeholder: 'data'
            },
            {
                label: 'Return Null on Error',
                name: 'returnNullOnError',
                type: 'boolean',
                default: false,
                description: 'Return null instead of throwing error when extraction fails',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const path = (nodeData.inputs?.path as string) || ''
        const returnNullOnError = (nodeData.inputs?.returnNullOnError as boolean) || false

        if (!path) {
            throw new Error('JSON Path is required')
        }

        return new JSONPathExtractorTool(path, returnNullOnError)
    }
}

module.exports = { nodeClass: JSONPathExtractor_Tools }
