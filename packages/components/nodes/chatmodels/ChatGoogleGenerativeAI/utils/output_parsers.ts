import { BaseLLMOutputParser, OutputParserException } from '@langchain/core/output_parsers'
import { ChatGeneration } from '@langchain/core/outputs'
import { ToolCall } from '@langchain/core/messages/tool'
import { InteropZodType, interopSafeParseAsync } from '@langchain/core/utils/types'
import { JsonOutputKeyToolsParserParamsInterop } from '@langchain/core/output_parsers/openai_tools'

interface GoogleGenerativeAIToolsOutputParserParams<T extends Record<string, any>> extends JsonOutputKeyToolsParserParamsInterop<T> {}

export class GoogleGenerativeAIToolsOutputParser<T extends Record<string, any> = Record<string, any>> extends BaseLLMOutputParser<T> {
    static lc_name() {
        return 'GoogleGenerativeAIToolsOutputParser'
    }

    lc_namespace = ['langchain', 'google_genai', 'output_parsers']

    returnId = false

    /** The type of tool calls to return. */
    keyName: string

    /** Whether to return only the first tool call. */
    returnSingle = false

    zodSchema?: InteropZodType<T>

    constructor(params: GoogleGenerativeAIToolsOutputParserParams<T>) {
        super(params)
        this.keyName = params.keyName
        this.returnSingle = params.returnSingle ?? this.returnSingle
        this.zodSchema = params.zodSchema
    }

    protected async _validateResult(result: unknown): Promise<T> {
        if (this.zodSchema === undefined) {
            return result as T
        }
        const zodParsedResult = await interopSafeParseAsync(this.zodSchema, result)
        if (zodParsedResult.success) {
            return zodParsedResult.data
        } else {
            throw new OutputParserException(
                `Failed to parse. Text: "${JSON.stringify(result, null, 2)}". Error: ${JSON.stringify(zodParsedResult.error.issues)}`,
                JSON.stringify(result, null, 2)
            )
        }
    }

    async parseResult(generations: ChatGeneration[]): Promise<T> {
        const tools = generations.flatMap((generation) => {
            const { message } = generation
            if (!('tool_calls' in message) || !Array.isArray(message.tool_calls)) {
                return []
            }
            return message.tool_calls as ToolCall[]
        })
        if (tools[0] === undefined) {
            throw new Error('No parseable tool calls provided to GoogleGenerativeAIToolsOutputParser.')
        }
        const [tool] = tools
        const validatedResult = await this._validateResult(tool.args)
        return validatedResult
    }
}
