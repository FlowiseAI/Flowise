import { z } from 'zod'
import { BaseOutputParser } from '@langchain/core/output_parsers'
import { StructuredOutputParser as LangchainStructuredOutputParser } from 'langchain/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'
import { convertSchemaToZod, getBaseClasses, INode, INodeData, INodeParams } from '../../../src'

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
                label: 'JSON Structure',
                name: 'jsonStructure',
                type: 'datagrid',
                description: 'JSON structure for LLM to return',
                datagrid: [
                    { field: 'property', headerName: 'Property', editable: true },
                    {
                        field: 'type',
                        headerName: 'Type',
                        type: 'singleSelect',
                        valueOptions: ['string', 'number', 'boolean'],
                        editable: true
                    },
                    { field: 'description', headerName: 'Description', editable: true, flex: 1 }
                ],
                default: [
                    {
                        property: 'answer',
                        type: 'string',
                        description: `answer to the user's question`
                    },
                    {
                        property: 'source',
                        type: 'string',
                        description: `sources used to answer the question, should be websites`
                    }
                ],
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const jsonStructure = nodeData.inputs?.jsonStructure as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        try {
            const structuredOutputParser = LangchainStructuredOutputParser.fromZodSchema(z.object(convertSchemaToZod(jsonStructure)))

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
