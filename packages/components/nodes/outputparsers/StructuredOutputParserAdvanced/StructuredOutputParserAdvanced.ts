import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'
import { BaseOutputParser } from '@langchain/core/output_parsers'
import { StructuredOutputParser as LangchainStructuredOutputParser } from 'langchain/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'
import { jsonrepair } from 'jsonrepair'
import { SecureZodSchemaParser } from '../../../src/secureZodParser'

class AdvancedStructuredOutputParser implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Advanced Structured Output Parser'
        this.name = 'advancedStructuredOutputParser'
        this.version = 1.0
        this.type = 'AdvancedStructuredOutputParser'
        this.description = 'Parse the output of an LLM call into a given structure by providing a Zod schema.'
        this.icon = 'structure.svg'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
            {
                label: 'Autofix',
                name: 'autofixParser',
                type: 'boolean',
                optional: true,
                description: 'In the event that the first call fails, will make another call to the model to fix any errors.'
            },
            {
                label: 'Example JSON',
                name: 'exampleJson',
                type: 'string',
                description: 'Zod schema for the output of the model',
                rows: 10,
                default: `z.object({
    title: z.string(), // Title of the movie as a string
    yearOfRelease: z.number().int(), // Release year as an integer number,
    genres: z.enum([
        "Action", "Comedy", "Drama", "Fantasy", "Horror",
        "Mystery", "Romance", "Science Fiction", "Thriller", "Documentary"
    ]).array().max(2), // Array of genres, max of 2 from the defined enum
    shortDescription: z.string().max(500) // Short description, max 500 characters
})`
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const schemaString = nodeData.inputs?.exampleJson as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        try {
            const zodSchema = SecureZodSchemaParser.parseZodSchema(schemaString)
            const structuredOutputParser = LangchainStructuredOutputParser.fromZodSchema(zodSchema)

            const baseParse = structuredOutputParser.parse

            // Fix broken JSON from LLM
            structuredOutputParser.parse = (text) => {
                const jsonString = text.includes('```') ? text.trim().split(/```(?:json)?/)[1] : text.trim()
                return baseParse.call(structuredOutputParser, jsonrepair(jsonString))
            }

            // NOTE: When we change Flowise to return a json response, the following has to be changed to: JsonStructuredOutputParser
            Object.defineProperty(structuredOutputParser, 'autoFix', {
                enumerable: true,
                configurable: true,
                writable: true,
                value: autoFix
            })
            return structuredOutputParser
        } catch (exception) {
            throw new Error('Error parsing Zod Schema: ' + exception)
        }
    }
}

module.exports = { nodeClass: AdvancedStructuredOutputParser }
