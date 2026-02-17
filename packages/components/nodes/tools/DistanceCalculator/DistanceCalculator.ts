import axios from 'axios'
import { z } from 'zod'
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

// Constants
const DEFAULT_TOOL_NAME = 'distance_calculator'
const DEFAULT_TOOL_DESC = `Calculate the driving distance, duration, and estimated price from a configured origin to a destination.
Input: the destination name (city, area, or address). Can be in Arabic or English.
Output: distance in km, travel time in minutes, and estimated price in EGP.
Use this tool when the user asks about distances, travel time, trip costs, or how far a location is.`

const DEFAULT_BASE_URL = 'https://apis.octobot.it.com'

// ----------- Tool Class -----------

type DistanceCalculatorToolInput = {
    name: string
    description: string
    baseUrl: string
}

class DistanceCalculatorTool extends StructuredTool {
    static lc_name() {
        return 'DistanceCalculatorTool'
    }

    name = DEFAULT_TOOL_NAME
    description = DEFAULT_TOOL_DESC
    baseUrl: string

    schema = z.object({
        destination: z
            .string()
            .describe(
                'The destination name to calculate distance to. Can be a city name, area, or address in Arabic or English (e.g. "Cairo", "القاهرة", "شارع التحرير القاهرة")'
            )
    })

    constructor(options: ToolParams & DistanceCalculatorToolInput) {
        super(options)
        this.name = options.name
        this.description = options.description
        this.baseUrl = options.baseUrl
    }

    protected async _call(arg: z.infer<typeof this.schema>, _runManager?: CallbackManagerForToolRun): Promise<string> {
        try {
            const { destination } = arg

            if (!destination || destination.trim().length === 0) {
                return JSON.stringify(
                    {
                        success: false,
                        error: 'Destination is required. Please provide a city name, area, or address.'
                    },
                    null,
                    2
                )
            }

            const url = `${this.baseUrl}/api/v1/distance`

            const response = await axios.get(url, {
                params: { destination: destination.trim() },
                timeout: 30000,
                headers: {
                    Accept: 'application/json'
                }
            })

            const data = response.data

            if (!data.success || data.results_count === 0) {
                return JSON.stringify(
                    {
                        success: false,
                        destination_query: data.destination_query || destination,
                        error: data.error || `No results found for "${destination}"`
                    },
                    null,
                    2
                )
            }

            // Return a clean, LLM-friendly formatted response
            const results = data.results.map((r: any) => ({
                name: r.name,
                formatted_address: r.formatted_address,
                distance: {
                    km: r.distance?.value_km,
                    text: r.distance?.text
                },
                duration: {
                    minutes: r.duration?.value_minutes,
                    text: r.duration?.text
                },
                price: {
                    egp: r.priceRate?.value_egp,
                    text: r.priceRate?.text
                }
            }))

            return JSON.stringify(
                {
                    success: true,
                    destination_query: data.destination_query,
                    results_count: data.results_count,
                    results
                },
                null,
                2
            )
        } catch (error: any) {
            // Handle HTTP error responses
            if (error.response) {
                const errData = error.response.data
                return JSON.stringify(
                    {
                        success: false,
                        error: errData?.error || `Request failed with status ${error.response.status}`,
                        details: errData?.details || undefined
                    },
                    null,
                    2
                )
            }

            // Handle network / timeout errors
            return JSON.stringify(
                {
                    success: false,
                    error: (error.message || 'Unknown error').substring(0, 200)
                },
                null,
                2
            )
        }
    }
}

// ----------- Node Class -----------

class DistanceCalculator_Tools implements INode {
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
        this.label = 'Distance Calculator'
        this.name = 'distanceCalculator'
        this.version = 1.0
        this.type = 'DistanceCalculator'
        this.icon = 'distance.png'
        this.category = 'Tools'
        this.description = 'Calculate driving distance, duration, and estimated price to any destination using OctoAPIs'
        this.baseClasses = [this.type, ...getBaseClasses(DistanceCalculatorTool), 'Tool']
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Name of the tool',
                default: DEFAULT_TOOL_NAME,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tool Description',
                name: 'toolDesc',
                type: 'string',
                rows: 4,
                description: 'Describe to the LLM when it should use this tool',
                default: DEFAULT_TOOL_DESC,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                description: 'Base URL for the Distance Calculator API',
                default: DEFAULT_BASE_URL,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const toolName = (nodeData.inputs?.toolName as string) || DEFAULT_TOOL_NAME
        const toolDesc = (nodeData.inputs?.toolDesc as string) || DEFAULT_TOOL_DESC
        const baseUrl = (nodeData.inputs?.baseUrl as string) || DEFAULT_BASE_URL

        return new DistanceCalculatorTool({
            name: toolName
                .toLowerCase()
                .replace(/ /g, '_')
                .replace(/[^a-z0-9_-]/g, ''),
            description: toolDesc,
            baseUrl: baseUrl.replace(/\/+$/, '') // strip trailing slashes
        })
    }
}

module.exports = { nodeClass: DistanceCalculator_Tools }
