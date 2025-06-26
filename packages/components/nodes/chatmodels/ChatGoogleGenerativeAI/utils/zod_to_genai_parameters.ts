import {
    type FunctionDeclarationSchema as GenerativeAIFunctionDeclarationSchema,
    type SchemaType as FunctionDeclarationSchemaType
} from '@google/generative-ai'
import { InteropZodType, isInteropZodSchema } from '@langchain/core/utils/types'
import { type JsonSchema7Type, toJsonSchema } from '@langchain/core/utils/json_schema'

export interface GenerativeAIJsonSchema extends Record<string, unknown> {
    properties?: Record<string, GenerativeAIJsonSchema>
    type: FunctionDeclarationSchemaType
}

export interface GenerativeAIJsonSchemaDirty extends GenerativeAIJsonSchema {
    properties?: Record<string, GenerativeAIJsonSchemaDirty>
    additionalProperties?: boolean
}

export function removeAdditionalProperties(obj: Record<string, any>): GenerativeAIJsonSchema {
    if (typeof obj === 'object' && obj !== null) {
        const newObj = { ...obj }

        if ('additionalProperties' in newObj) {
            delete newObj.additionalProperties
        }
        if ('$schema' in newObj) {
            delete newObj.$schema
        }
        if ('strict' in newObj) {
            delete newObj.strict
        }

        for (const key in newObj) {
            if (key in newObj) {
                if (Array.isArray(newObj[key])) {
                    newObj[key] = newObj[key].map(removeAdditionalProperties)
                } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
                    newObj[key] = removeAdditionalProperties(newObj[key])
                }
            }
        }

        return newObj as GenerativeAIJsonSchema
    }

    return obj as GenerativeAIJsonSchema
}

export function schemaToGenerativeAIParameters<RunOutput extends Record<string, any> = Record<string, any>>(
    schema: InteropZodType<RunOutput> | JsonSchema7Type
): GenerativeAIFunctionDeclarationSchema {
    // GenerativeAI doesn't accept either the $schema or additionalProperties
    // attributes, so we need to explicitly remove them.
    const jsonSchema = removeAdditionalProperties(isInteropZodSchema(schema) ? toJsonSchema(schema) : schema)
    const { _schema, ...rest } = jsonSchema

    return rest as GenerativeAIFunctionDeclarationSchema
}

export function jsonSchemaToGeminiParameters(schema: Record<string, any>): GenerativeAIFunctionDeclarationSchema {
    // Gemini doesn't accept either the $schema or additionalProperties
    // attributes, so we need to explicitly remove them.

    const jsonSchema = removeAdditionalProperties(schema as GenerativeAIJsonSchemaDirty)
    const { _schema, ...rest } = jsonSchema

    return rest as GenerativeAIFunctionDeclarationSchema
}
