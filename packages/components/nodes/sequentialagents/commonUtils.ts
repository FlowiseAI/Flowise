import { get } from 'lodash'
import { z } from 'zod'
import { DataSource } from 'typeorm'
import { NodeVM } from 'vm2'
import { BaseMessage, MessageContentImageUrl } from '@langchain/core/messages'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { addImagesToMessages, llmSupportsVision } from '../../src/multiModalUtils'
import { ICommonObject, IDatabaseEntity, INodeData, ISeqAgentsState, IVisionChatModal } from '../../src/Interface'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../src/utils'
import { StructuredTool } from '@langchain/core/tools'

export const SELECTED_CONDITION_TYPE_PREFIX = '_FLOWISE_SELECTED_CONDITION_TYPE_'

export const checkCondition = (input: string | number | undefined, condition: string, value: string | number = ''): boolean => {
    if (!input) return false

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
                const messageOutput = ((state.messages as unknown as BaseMessage[]) ?? []).find(
                    (message) => message.additional_kwargs && message.additional_kwargs?.nodeId === parsedValue.id
                )
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
