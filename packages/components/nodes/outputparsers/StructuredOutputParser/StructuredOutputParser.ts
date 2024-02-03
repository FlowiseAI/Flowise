import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { StructuredOutputParser as LangchainStructuredOutputParser } from 'langchain/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'
import { z } from 'zod'
import { jsonToZod } from 'json-to-zod'

class StructuredOutputParser implements INode {
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
        this.label = 'Structured Output Parser'
        this.name = 'structuredOutputParser'
        this.version = 1.0
        this.type = 'StructuredOutputParser'
        this.description = 'Parse the output of an LLM call into a given (JSON) structure.'
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
                description: 'Example JSON structure for LLM to return',
                rows: 10,
                default: '{"answer": "the answer", "followupQuestions": ["question1", "question2"]}',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const exampleJson = nodeData.inputs?.exampleJson as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        const jsonToZodString = jsonToZod(JSON.parse(exampleJson))
        const splitString = jsonToZodString.split('const schema = ')
        const schemaString = splitString[1].trim()
        
        const fnString = `function proxyFn(z){ return ${schemaString} }`
        const zodSchemaFunction = new Function('z', `return ${schemaString}`)
        const zodSchema = zodSchemaFunction(z)

        try {
            const structuredOutputParser = LangchainStructuredOutputParser.fromZodSchema(zodSchema)

            // NOTE: When we change Flowise to return a json response, the following has to be changed to: JsonStructuredOutputParser
            Object.defineProperty(structuredOutputParser, 'autoFix', {
                enumerable: true,
                configurable: true,
                writable: true,
                value: autoFix
            })
            return structuredOutputParser
        } catch (exception) {
            throw new Error('Invalid JSON in StructuredOutputParser: ' + exception)
        }
    }
}

module.exports = { nodeClass: StructuredOutputParser }
