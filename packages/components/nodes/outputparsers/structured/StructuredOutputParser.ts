import { getBaseClasses, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { StructuredOutputParser as LangchainStructuredOutputParser } from 'langchain/output_parsers'

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
        this.category = 'Output Parser'
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
            {
                label: 'Structure Type',
                name: 'structureType',
                type: 'options',
                options: [
                    {
                        label: 'Names And Descriptions',
                        name: 'fromNamesAndDescriptions'
                    },
                    {
                        label: 'Zod Schema',
                        name: 'fromZodSchema'
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
            }
        ]
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const structureType = nodeData.inputs?.structureType as string
        const structure = nodeData.inputs?.structure as string
        let parsedStructure: any | undefined = undefined
        if (structure) {
            try {
                parsedStructure = JSON.parse(structure)
            } catch (exception) {
                throw new Error('Invalid JSON in StructuredOutputParser: ' + exception)
            }
        }
        if (structureType === 'fromZodSchema') {
            return LangchainStructuredOutputParser.fromZodSchema(parsedStructure)
        } else {
            return LangchainStructuredOutputParser.fromNamesAndDescriptions(parsedStructure)
        }
    }
}

module.exports = { nodeClass: StructuredOutputParser }
