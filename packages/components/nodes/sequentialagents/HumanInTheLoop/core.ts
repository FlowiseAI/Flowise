import { DataSource } from 'typeorm'
import { ICommonObject } from '../../../src/Interface'

/**
 * Creates a new action request in the database
 */
export async function createActionRequest(
    appDataSource: DataSource,
    data: {
        flowId: string
        sessionId: string
        nodeId: string
        outputTypes: string[]
        context: {
            question: string
            metadata: any
        }
    }
): Promise<ICommonObject> {
    const actionRequest = await appDataSource.getRepository('ActionRequest').save({
        ...data,
        status: 'pending'
    })

    return actionRequest
}

/**
 * Enhances the prompt based on selected output types
 */
export function enhancePrompt(
    basePrompt: string,
    outputTypes: string[],
    config: {
        chatConfig?: { responseOptions?: string[] }
        emailConfig?: { subjectPrefix?: string; includeAttachments?: boolean }
        customSchema?: Array<{ key: string; type: string; description: string }>
    }
): string {
    let prompt = basePrompt

    if (outputTypes.includes('email')) {
        prompt += '\n\nStructure the response as an email with:\n'
        prompt += '- to: array of recipient emails\n'
        prompt += '- cc: (optional) array of cc emails\n'
        prompt += '- bcc: (optional) array of bcc emails\n'
        prompt += '- bodyHTML: HTML formatted content\n'
        prompt += '- bodyText: Plain text content\n'
        prompt += '- attachments: (optional) array of attachment URLs'
    }

    if (outputTypes.includes('chat')) {
        const responseOptions = config.chatConfig?.responseOptions || []
        prompt += '\n\nFormat as a chat message with:\n'
        prompt += '- message: the chat content\n'
        if (responseOptions.length) {
            prompt += `- expectedResponse: one of [${responseOptions.join(', ')}]`
        }
    }

    if (outputTypes.includes('custom') && config.customSchema) {
        prompt += '\n\nInclude the following custom fields:\n'
        for (const field of config.customSchema) {
            prompt += `- ${field.key} (${field.type}): ${field.description}\n`
        }
    }

    return prompt
}

/**
 * Validates the output format based on type
 */
export function validateOutput(
    output: any,
    outputType: string,
    config: {
        chatConfig?: { responseOptions?: string[] }
        customSchema?: Array<{ key: string; type: string }>
    }
): boolean {
    switch (outputType) {
        case 'chat':
            if (!output.message || typeof output.message !== 'string') return false
            if (config.chatConfig?.responseOptions?.length) {
                if (!output.expectedResponse || !config.chatConfig.responseOptions.includes(output.expectedResponse)) {
                    return false
                }
            }
            return true

        case 'email':
            if (!output.to || !Array.isArray(output.to)) return false
            if (!output.bodyHTML || typeof output.bodyHTML !== 'string') return false
            if (!output.bodyText || typeof output.bodyText !== 'string') return false
            return true

        case 'custom':
            if (!config.customSchema) return true
            for (const field of config.customSchema) {
                const value = output[field.key]
                if (value === undefined) return false
                switch (field.type.toLowerCase()) {
                    case 'string':
                        if (typeof value !== 'string') return false
                        break
                    case 'number':
                        if (typeof value !== 'number') return false
                        break
                    case 'boolean':
                        if (typeof value !== 'boolean') return false
                        break
                    case 'array':
                        if (!Array.isArray(value)) return false
                        break
                }
            }
            return true

        default:
            return false
    }
} 