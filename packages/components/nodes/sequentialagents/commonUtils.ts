import { get } from 'lodash'
import { z } from 'zod'
import { DataSource } from 'typeorm'
import { NodeVM } from '@flowiseai/nodevm'
import { StructuredTool } from '@langchain/core/tools'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatAnthropic } from '@langchain/anthropic'
import { Runnable, RunnableConfig, mergeConfigs } from '@langchain/core/runnables'
import { AIMessage, BaseMessage, HumanMessage, MessageContentImageUrl, ToolMessage } from '@langchain/core/messages'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { addImagesToMessages, llmSupportsVision } from '../../src/multiModalUtils'
import { ICommonObject, IDatabaseEntity, INodeData, ISeqAgentsState, IVisionChatModal } from '../../src/Interface'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../src/utils'
import { ChatPromptTemplate, BaseMessagePromptTemplateLike } from '@langchain/core/prompts'

export const checkCondition = (input: string | number | undefined, condition: string, value: string | number = ''): boolean => {
    if (!input && condition === 'Is Empty') return true
    else if (!input) return false

    // Function to check if a string is a valid number
    const isNumericString = (str: string): boolean => /^-?\d*\.?\d+$/.test(str)

    // Function to convert input to number if possible
    const toNumber = (val: string | number): number => {
        if (typeof val === 'number') return val
        return isNumericString(val) ? parseFloat(val) : NaN
    }

    // Convert input and value to numbers
    const numInput = toNumber(input)
    const numValue = toNumber(value)

    // Helper function for numeric comparisons
    const numericCompare = (comp: (a: number, b: number) => boolean): boolean => {
        if (isNaN(numInput) || isNaN(numValue)) return false
        return comp(numInput, numValue)
    }

    // Helper function for string operations
    const stringCompare = (strInput: string | number, strValue: string | number, op: (a: string, b: string) => boolean): boolean => {
        return op(String(strInput), String(strValue))
    }

    switch (condition) {
        // String conditions
        case 'Contains':
            return stringCompare(input, value, (a, b) => a.includes(b))
        case 'Not Contains':
            return stringCompare(input, value, (a, b) => !a.includes(b))
        case 'Start With':
            return stringCompare(input, value, (a, b) => a.startsWith(b))
        case 'End With':
            return stringCompare(input, value, (a, b) => a.endsWith(b))
        case 'Is':
            return String(input) === String(value)
        case 'Is Not':
            return String(input) !== String(value)
        case 'Is Empty':
            return String(input).trim().length === 0
        case 'Is Not Empty':
            return String(input).trim().length > 0

        // Numeric conditions
        case 'Greater Than':
            return numericCompare((a, b) => a > b)
        case 'Less Than':
            return numericCompare((a, b) => a < b)
        case 'Equal To':
            return numericCompare((a, b) => a === b)
        case 'Not Equal To':
            return numericCompare((a, b) => a !== b)
        case 'Greater Than or Equal To':
            return numericCompare((a, b) => a >= b)
        case 'Less Than or Equal To':
            return numericCompare((a, b) => a <= b)

        default:
            return false
    }
}

export const transformObjectPropertyToFunction = (obj: ICommonObject, state: ISeqAgentsState) => {
    const transformedObject: ICommonObject = {}

    for (const key in obj) {
        let value = obj[key]
        // get message from agent
        try {
            const parsedValue = JSON.parse(value)
            if (typeof parsedValue === 'object' && parsedValue.id) {
                const messageOutputs = ((state.messages as unknown as BaseMessage[]) ?? []).filter(
                    (message) => message.additional_kwargs && message.additional_kwargs?.nodeId === parsedValue.id
                )
                const messageOutput = messageOutputs[messageOutputs.length - 1]
                if (messageOutput) value = messageOutput.content
            }
        } catch (e) {
            // do nothing
        }
        // get state value
        if (value.startsWith('$flow.state')) {
            value = customGet(state, value.replace('$flow.state.', ''))
            if (typeof value === 'object') value = JSON.stringify(value)
        }
        transformedObject[key] = () => value
    }

    return transformedObject
}

export const processImageMessage = async (llm: BaseChatModel, nodeData: INodeData, options: ICommonObject) => {
    let multiModalMessageContent: MessageContentImageUrl[] = []

    if (llmSupportsVision(llm)) {
        const visionChatModel = llm as IVisionChatModal
        multiModalMessageContent = await addImagesToMessages(nodeData, options, llm.multiModalOption)

        if (multiModalMessageContent?.length) {
            visionChatModel.setVisionModel()
        } else {
            visionChatModel.revertToOriginalModel()
        }
    }

    return multiModalMessageContent
}

export const getVM = async (appDataSource: DataSource, databaseEntities: IDatabaseEntity, nodeData: INodeData, flow: ICommonObject) => {
    const variables = await getVars(appDataSource, databaseEntities, nodeData)

    let sandbox: any = {}
    sandbox['$vars'] = prepareSandboxVars(variables)
    sandbox['$flow'] = flow

    const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
        ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
        : defaultAllowBuiltInDep
    const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
    const deps = availableDependencies.concat(externalDeps)

    const nodeVMOptions = {
        console: 'inherit',
        sandbox,
        require: {
            external: { modules: deps },
            builtin: builtinDeps
        }
    } as any

    return new NodeVM(nodeVMOptions)
}

export const customGet = (obj: any, path: string) => {
    if (path.includes('[-1]')) {
        const parts = path.split('.')
        let result = obj

        for (let part of parts) {
            if (part.includes('[') && part.includes(']')) {
                const [name, indexPart] = part.split('[')
                const index = parseInt(indexPart.replace(']', ''))

                result = result[name]
                if (Array.isArray(result)) {
                    if (index < 0) {
                        result = result[result.length + index]
                    } else {
                        result = result[index]
                    }
                } else {
                    return undefined
                }
            } else {
                result = get(result, part)
            }

            if (result === undefined) {
                return undefined
            }
        }

        return result
    } else {
        return get(obj, path)
    }
}

export const convertStructuredSchemaToZod = (schema: string | object): ICommonObject => {
    try {
        const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema
        const zodObj: ICommonObject = {}
        for (const sch of parsedSchema) {
            if (sch.type === 'String') {
                zodObj[sch.key] = z.string().describe(sch.description)
            } else if (sch.type === 'String Array') {
                zodObj[sch.key] = z.array(z.string()).describe(sch.description)
            } else if (sch.type === 'Number') {
                zodObj[sch.key] = z.number().describe(sch.description)
            } else if (sch.type === 'Boolean') {
                zodObj[sch.key] = z.boolean().describe(sch.description)
            } else if (sch.type === 'Enum') {
                zodObj[sch.key] = z.enum(sch.enumValues.split(',').map((item: string) => item.trim())).describe(sch.description)
            }
        }
        return zodObj
    } catch (e) {
        throw new Error(e)
    }
}

export const restructureMessages = (llm: BaseChatModel, state: ISeqAgentsState) => {
    const messages: BaseMessage[] = []
    for (const message of state.messages as unknown as BaseMessage[]) {
        // Sometimes Anthropic can return a message with content types of array, ignore that EXECEPT when tool calls are present
        if ((message as any).tool_calls?.length && message.content !== '') {
            message.content = JSON.stringify(message.content)
        }

        if (typeof message.content === 'string') {
            messages.push(message)
        }
    }

    const isToolMessage = (message: BaseMessage) => message instanceof ToolMessage || message.constructor.name === 'ToolMessageChunk'
    const isAIMessage = (message: BaseMessage) => message instanceof AIMessage || message.constructor.name === 'AIMessageChunk'
    const isHumanMessage = (message: BaseMessage) => message instanceof HumanMessage || message.constructor.name === 'HumanMessageChunk'

    /*
     * MistralAI does not support:
     * 1.) Last message as AI Message or Tool Message
     * 2.) Tool Message followed by Human Message
     */
    if (llm instanceof ChatMistralAI) {
        if (messages.length > 1) {
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i]

                // If last message is denied Tool Message, add a new Human Message
                if (isToolMessage(message) && i === messages.length - 1 && message.additional_kwargs?.toolCallsDenied) {
                    messages.push(new AIMessage({ content: `Tool calls got denied. Do you have other questions?` }))
                } else if (i + 1 < messages.length) {
                    const nextMessage = messages[i + 1]
                    const currentMessage = message

                    // If current message is Tool Message and next message is Human Message, add AI Message between Tool and Human Message
                    if (isToolMessage(currentMessage) && isHumanMessage(nextMessage)) {
                        messages.splice(i + 1, 0, new AIMessage({ content: 'Tool calls executed' }))
                    }

                    // If last message is AI Message or Tool Message, add Human Message
                    if (i + 1 === messages.length - 1 && (isAIMessage(nextMessage) || isToolMessage(nextMessage))) {
                        messages.push(new HumanMessage({ content: nextMessage.content || 'Given the user question, answer user query' }))
                    }
                }
            }
        }
    } else if (llm instanceof ChatAnthropic) {
        /*
         * Anthropic does not support first message as AI Message
         */
        if (messages.length) {
            const firstMessage = messages[0]
            if (isAIMessage(firstMessage)) {
                messages.shift()
                messages.unshift(new HumanMessage({ ...firstMessage }))
            }
        }
    }

    return messages
}

export class ExtractTool extends StructuredTool {
    name = 'extract'

    description = 'Extract structured data from the output'

    schema

    constructor(fields: ICommonObject) {
        super()
        this.schema = fields.schema
    }

    async _call(input: any) {
        return JSON.stringify(input)
    }
}

export interface RunnableCallableArgs extends Partial<any> {
    name?: string
    func: (...args: any[]) => any
    tags?: string[]
    trace?: boolean
    recurse?: boolean
}

export interface MessagesState {
    messages: BaseMessage[]
}

export class RunnableCallable<I = unknown, O = unknown> extends Runnable<I, O> {
    lc_namespace: string[] = ['langgraph']

    func: (...args: any[]) => any

    tags?: string[]

    config?: RunnableConfig

    trace: boolean = true

    recurse: boolean = true

    constructor(fields: RunnableCallableArgs) {
        super()
        this.name = fields.name ?? fields.func.name
        this.func = fields.func
        this.config = fields.tags ? { tags: fields.tags } : undefined
        this.trace = fields.trace ?? this.trace
        this.recurse = fields.recurse ?? this.recurse

        if (fields.metadata) {
            this.config = { ...this.config, metadata: { ...this.config, ...fields.metadata } }
        }
    }

    async invoke(input: any, options?: Partial<RunnableConfig> | undefined): Promise<any> {
        if (this.func === undefined) {
            return this.invoke(input, options)
        }

        let returnValue: any

        if (this.trace) {
            returnValue = await this._callWithConfig(this.func, input, mergeConfigs(this.config, options))
        } else {
            returnValue = await this.func(input, mergeConfigs(this.config, options))
        }

        if (returnValue instanceof Runnable && this.recurse) {
            return await returnValue.invoke(input, options)
        }

        return returnValue
    }
}

export const checkMessageHistory = async (
    nodeData: INodeData,
    options: ICommonObject,
    prompt: ChatPromptTemplate,
    promptArrays: BaseMessagePromptTemplateLike[],
    sysPrompt: string
) => {
    const messageHistory = nodeData.inputs?.messageHistory

    if (messageHistory) {
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const vm = await getVM(appDataSource, databaseEntities, nodeData, {})
        try {
            const response = await vm.run(`module.exports = async function() {${messageHistory}}()`, __dirname)
            if (!Array.isArray(response)) throw new Error('Returned message history must be an array')
            if (sysPrompt) {
                // insert at index 1
                promptArrays.splice(1, 0, ...response)
            } else {
                promptArrays.unshift(...response)
            }
            prompt = ChatPromptTemplate.fromMessages(promptArrays)
        } catch (e) {
            throw new Error(e)
        }
    }

    return prompt
}
