import { BaseOutputParser } from '@langchain/core/output_parsers'
import { OutputFixingParser } from 'langchain/output_parsers'
import { ICommonObject, INodeData } from '../../../src/Interface'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

const { nodeClass: OriginalToolAgent } = require('./ToolAgent')

// Create a properly typed base class
const ToolAgentBase = OriginalToolAgent as new (fields?: { sessionId?: string }) => any

// AAI-branded clone of ToolAgent for Answer tab with structured output support
class AAIToolAgent_Agents extends ToolAgentBase {
    outputParser: BaseOutputParser

    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'Tool Agent'
        this.name = 'aaiToolAgent'
        this.category = 'Agents'
        this.description = 'Tool Agent • Zero configuration required • Supports structured output'
        this.tags = ['AAI']

        // Add output parser input to the existing inputs
        this.inputs = [
            ...this.inputs,
            {
                label: 'Output Parser',
                name: 'outputParser',
                type: 'BaseLLMOutputParser',
                optional: true,
                description: 'Parse the agent output into a structured format'
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        // Initialize output parser if provided
        const llmOutputParser = nodeData.inputs?.outputParser as BaseOutputParser
        this.outputParser = llmOutputParser

        if (llmOutputParser) {
            let autoFix = (llmOutputParser as any).autoFix
            if (autoFix === true) {
                // Get the model from nodeData to create OutputFixingParser
                const model = nodeData.inputs?.model
                if (model) {
                    this.outputParser = OutputFixingParser.fromLLM(model, llmOutputParser)
                }
            }

            // Inject format instructions into system message and Chat Prompt Template
            this.injectFormatInstructions(nodeData)
        }

        // Call the parent init method
        return await super.init(nodeData, input, options)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        // Call the parent run method
        const result = await super.run(nodeData, input, options)

        // Apply output parser to the final result if parser is available
        if (this.outputParser && result) {
            return await this.parseOutput(result)
        }

        return result
    }

    private injectFormatInstructions(nodeData: INodeData) {
        if (!this.outputParser || !nodeData.inputs) return

        const formatInstructions = this.outputParser.getFormatInstructions()
        if (!formatInstructions) return

        // Escape curly braces to prevent LangChain template parsing issues
        const escapedInstructions = formatInstructions.replace(/\{/g, '{{').replace(/\}/g, '}}')
        const instructionText = `\n\nIMPORTANT: Your final response must follow this exact format:\n${escapedInstructions}`

        // Handle Chat Prompt Template if it exists
        const chatPromptTemplate = nodeData.inputs?.chatPromptTemplate
        if (chatPromptTemplate && chatPromptTemplate.promptMessages?.length > 0) {
            // Inject into the first system message of the Chat Prompt Template
            const systemMessage = chatPromptTemplate.promptMessages[0]
            if (systemMessage && (systemMessage as any).prompt?.template) {
                const currentTemplate = (systemMessage as any).prompt.template
                ;(systemMessage as any).prompt.template = currentTemplate + instructionText
            }
        } else {
            // Handle regular system message
            let systemMessage = (nodeData.inputs?.systemMessage as string) || ''
            if (systemMessage) {
                nodeData.inputs.systemMessage = systemMessage + instructionText
            } else {
                nodeData.inputs.systemMessage = `You are a helpful assistant.${instructionText}`
            }
        }
    }

    private async parseOutput(result: string | ICommonObject): Promise<string | ICommonObject> {
        try {
            let textToParse: string

            // Extract text from result
            if (typeof result === 'string') {
                textToParse = result
            } else if (result && typeof result === 'object' && 'text' in result) {
                textToParse = result.text as string
            } else {
                // If result is not in expected format, return as-is
                return result
            }

            // Parse the output using the output parser
            const parsedOutput = await this.outputParser.parse(textToParse)

            // Format the response properly for consistency with LLM Chain
            const formattedOutput = formatResponse(parsedOutput as string | object)

            // If original result was an object with additional metadata, preserve it
            if (typeof result === 'object' && result !== null && 'text' in result) {
                // For Tool Agent with metadata, return the structured format like LLM Chain
                // Remove the 'text' property and merge the formatted output at the top level
                const { text: _text, ...metadata } = result

                // Handle both object and string formatted outputs
                let finalResult: ICommonObject
                if (typeof formattedOutput === 'object' && formattedOutput !== null) {
                    finalResult = {
                        ...formattedOutput, // This adds the 'json' property at top level
                        ...metadata, // Preserve usedTools, sourceDocuments, artifacts, etc.
                        parsedOutput: parsedOutput // Include the raw structured parsed output for debugging
                    }
                } else {
                    // If formattedOutput is a string, create json wrapper like LLM Chain does
                    finalResult = {
                        json: parsedOutput, // Direct structured output
                        ...metadata, // Preserve usedTools, sourceDocuments, artifacts, etc.
                        parsedOutput: parsedOutput // Include the raw structured parsed output for debugging
                    }
                }
                return finalResult
            }

            return formattedOutput
        } catch (error) {
            // If parsing fails, return the original result
            return result
        }
    }
}

module.exports = { nodeClass: AAIToolAgent_Agents }
