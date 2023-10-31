import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { StructuredOutputParser as LangchainStructuredOutputParser } from 'langchain/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'

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
        this.icon = 'structure.png'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        //TODO: To extend the structureType to ZodSchema
        this.inputs = [
            {
                label: 'Structure Type',
                name: 'structureType',
                type: 'options',
                options: [
                    {
                        label: 'Names And Descriptions',
                        name: 'fromNamesAndDescriptions'
                    }
                ],
                default: 'fromNamesAndDescriptions'
            },
            {
                label: 'Structure',
                name: 'structure',
                type: 'string',
                rows: 4,
                placeholder:
                    '{' +
                    '  answer: "answer to the question",\n' +
                    '  source: "source used to answer the question, should be a website.",\n' +
                    '}'
            },
            {
                label: 'Autofix',
                name: 'autofixParser',
                type: 'boolean',
                optional: true,
                description: 'In the event that the first call fails, will make another call to the model to fix any errors.'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const structureType = nodeData.inputs?.structureType as string
        const structure = nodeData.inputs?.structure as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        let parsedStructure: any | undefined = undefined
        if (structure && structureType === 'fromNamesAndDescriptions') {
            try {
                parsedStructure = JSON.parse(structure)

                // NOTE: When we change Flowise to return a json response, the following has to be changed to: JsonStructuredOutputParser
                let structuredOutputParser = LangchainStructuredOutputParser.fromNamesAndDescriptions(parsedStructure)
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
        throw new Error('Error creating OutputParser.')
    }
}

module.exports = { nodeClass: StructuredOutputParser }
