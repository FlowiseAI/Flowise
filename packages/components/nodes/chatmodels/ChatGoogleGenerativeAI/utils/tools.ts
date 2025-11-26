import {
    Tool as GenerativeAITool,
    ToolConfig,
    FunctionCallingMode,
    FunctionDeclaration,
    FunctionDeclarationsTool,
    FunctionDeclarationSchema
} from '@google/generative-ai'
import { ToolChoice } from '@langchain/core/language_models/chat_models'
import { StructuredToolInterface } from '@langchain/core/tools'
import { isLangChainTool } from '@langchain/core/utils/function_calling'
import { isOpenAITool, ToolDefinition } from '@langchain/core/language_models/base'
import { convertToGenerativeAITools } from './common.js'
import { GoogleGenerativeAIToolType } from './types.js'
import { removeAdditionalProperties } from './zod_to_genai_parameters.js'

export function convertToolsToGenAI(
    tools: GoogleGenerativeAIToolType[],
    extra?: {
        toolChoice?: ToolChoice
        allowedFunctionNames?: string[]
    }
): {
    tools: GenerativeAITool[]
    toolConfig?: ToolConfig
} {
    // Extract function declaration processing to a separate function
    const genAITools = processTools(tools)

    // Simplify tool config creation
    const toolConfig = createToolConfig(genAITools, extra)

    return { tools: genAITools, toolConfig }
}

function processTools(tools: GoogleGenerativeAIToolType[]): GenerativeAITool[] {
    let functionDeclarationTools: FunctionDeclaration[] = []
    const genAITools: GenerativeAITool[] = []

    tools.forEach((tool) => {
        if (isLangChainTool(tool)) {
            const [convertedTool] = convertToGenerativeAITools([tool as StructuredToolInterface])
            if (convertedTool.functionDeclarations) {
                functionDeclarationTools.push(...convertedTool.functionDeclarations)
            }
        } else if (isOpenAITool(tool)) {
            const { functionDeclarations } = convertOpenAIToolToGenAI(tool)
            if (functionDeclarations) {
                functionDeclarationTools.push(...functionDeclarations)
            } else {
                throw new Error('Failed to convert OpenAI structured tool to GenerativeAI tool')
            }
        } else {
            genAITools.push(tool as GenerativeAITool)
        }
    })

    const genAIFunctionDeclaration = genAITools.find((t) => 'functionDeclarations' in t)
    if (genAIFunctionDeclaration) {
        return genAITools.map((tool) => {
            if (functionDeclarationTools?.length > 0 && 'functionDeclarations' in tool) {
                const newTool = {
                    functionDeclarations: [...(tool.functionDeclarations || []), ...functionDeclarationTools]
                }
                // Clear the functionDeclarationTools array so it is not passed again
                functionDeclarationTools = []
                return newTool
            }
            return tool
        })
    }

    return [
        ...genAITools,
        ...(functionDeclarationTools.length > 0
            ? [
                  {
                      functionDeclarations: functionDeclarationTools
                  }
              ]
            : [])
    ]
}

function convertOpenAIToolToGenAI(tool: ToolDefinition): FunctionDeclarationsTool {
    return {
        functionDeclarations: [
            {
                name: tool.function.name,
                description: tool.function.description,
                parameters: removeAdditionalProperties(tool.function.parameters) as FunctionDeclarationSchema
            }
        ]
    }
}

function createToolConfig(
    genAITools: GenerativeAITool[],
    extra?: {
        toolChoice?: ToolChoice
        allowedFunctionNames?: string[]
    }
): ToolConfig | undefined {
    if (!genAITools.length || !extra) return undefined

    const { toolChoice, allowedFunctionNames } = extra

    const modeMap: Record<string, FunctionCallingMode> = {
        any: FunctionCallingMode.ANY,
        auto: FunctionCallingMode.AUTO,
        none: FunctionCallingMode.NONE
    }

    if (toolChoice && ['any', 'auto', 'none'].includes(toolChoice as string)) {
        return {
            functionCallingConfig: {
                mode: modeMap[toolChoice as keyof typeof modeMap] ?? 'MODE_UNSPECIFIED',
                allowedFunctionNames
            }
        }
    }

    if (typeof toolChoice === 'string' || allowedFunctionNames) {
        return {
            functionCallingConfig: {
                mode: FunctionCallingMode.ANY,
                allowedFunctionNames: [
                    ...(allowedFunctionNames ?? []),
                    ...(toolChoice && typeof toolChoice === 'string' ? [toolChoice] : [])
                ]
            }
        }
    }

    return undefined
}
