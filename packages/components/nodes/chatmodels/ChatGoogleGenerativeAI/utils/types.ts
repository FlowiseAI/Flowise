import {
    CodeExecutionTool,
    FunctionDeclarationsTool as GoogleGenerativeAIFunctionDeclarationsTool,
    GoogleSearchRetrievalTool
} from '@google/generative-ai'
import { BindToolsInput } from '@langchain/core/language_models/chat_models'

export type GoogleGenerativeAIToolType =
    | BindToolsInput
    | GoogleGenerativeAIFunctionDeclarationsTool
    | CodeExecutionTool
    | GoogleSearchRetrievalTool
