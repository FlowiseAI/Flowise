import { StatusCodes } from 'http-status-codes'
import { IReactFlowObject } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { verifyWebhookSignature, verifyPlainToken } from '../../utils/signatureVerification'
import chatflowsService from '../chatflows'

const validateWebhookChatflow = async (
    chatflowId: string,
    workspaceId?: string,
    body?: Record<string, any>,
    method?: string,
    headers?: Record<string, any>,
    query?: Record<string, any>,
    rawBody?: Buffer,
    options?: { skipFieldValidation?: boolean }
): Promise<{ callbackUrl?: string; callbackSecret?: string }> => {
    try {
        const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
        const startNode = parsedFlowData.nodes.find((node) => node.data.name === 'startAgentflow')
        const startInputType = startNode?.data?.inputs?.startInputType

        if (startInputType !== 'webhookTrigger') {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} is not configured as a webhook trigger`)
        }

        const callbackUrl = (startNode?.data?.inputs?.callbackUrl as string | undefined) || undefined
        const callbackSecret = (startNode?.data?.inputs?.callbackSecret as string | undefined) || undefined

        // Signature verification (runs before any other validation to fail-fast on bad auth)
        if (chatflow.webhookSecretConfigured) {
            const sigHeader = ((startNode?.data?.inputs?.webhookSignatureHeader as string) || 'x-webhook-signature').toLowerCase()
            const sigType = (startNode?.data?.inputs?.webhookSignatureType as string) || 'hmac-sha256'
            const sigValue = (headers?.[sigHeader] ?? '') as string

            if (!sigValue) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid or missing webhook signature')
            }

            const secret = await chatflowsService.getWebhookSecret(chatflowId, chatflow.workspaceId)
            const valid =
                sigType === 'plain-token'
                    ? !!secret && verifyPlainToken(secret, sigValue)
                    : !!secret && !!rawBody && verifyWebhookSignature(secret, rawBody, sigValue)

            if (!valid) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid or missing webhook signature')
            }
        }

        if (options?.skipFieldValidation) return { callbackUrl, callbackSecret }

        // Method validation
        const webhookMethod = startNode?.data?.inputs?.webhookMethod
        if (webhookMethod && method?.toUpperCase() !== webhookMethod.toUpperCase()) {
            throw new InternalFlowiseError(StatusCodes.METHOD_NOT_ALLOWED, `Method ${method} not allowed. Expected ${webhookMethod}`)
        }

        // Content-Type validation (startsWith handles "application/json; charset=utf-8" variants)
        const webhookContentType = startNode?.data?.inputs?.webhookContentType
        const incomingContentType = (headers?.['content-type'] ?? '').toLowerCase()
        if (webhookContentType && !incomingContentType.startsWith(webhookContentType)) {
            throw new InternalFlowiseError(
                StatusCodes.UNSUPPORTED_MEDIA_TYPE,
                `Content-Type ${headers?.['content-type']} not allowed. Expected ${webhookContentType}`
            )
        }

        // Required header validation
        const rawHeaderParams = startNode?.data?.inputs?.webhookHeaderParams
        const webhookHeaderParams: Array<{ name: string; required: boolean }> = Array.isArray(rawHeaderParams) ? rawHeaderParams : []
        const missingHeaders = webhookHeaderParams.filter((p) => p.required && headers?.[p.name.toLowerCase()] == null).map((p) => p.name)
        if (missingHeaders.length > 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Missing required headers: ${missingHeaders.join(', ')}`)
        }

        // Required body param validation
        const rawBodyParams = startNode?.data?.inputs?.webhookBodyParams
        const webhookBodyParams: Array<{ name: string; type: string; required: boolean }> = Array.isArray(rawBodyParams)
            ? rawBodyParams
            : []
        const missingParams = webhookBodyParams.filter((p) => p.required && body?.[p.name] == null).map((p) => p.name)
        if (missingParams.length > 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Missing required webhook body parameters: ${missingParams.join(', ')}`)
        }

        // Body type validation (only for params that have an explicit type declared)
        const typeMismatch = webhookBodyParams
            .filter((p) => {
                if (p.type == null || body?.[p.name] == null) return false
                const val = body[p.name]
                if (p.type === 'number') return val === '' || isNaN(Number(val))
                if (p.type === 'boolean') return typeof val !== 'boolean' && val !== 'true' && val !== 'false'
                return typeof val !== p.type
            })
            .map((p) => p.name)

        if (typeMismatch.length > 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Invalid type for parameter(s): ${typeMismatch.join(', ')}`)
        }

        // Required query param validation
        const rawQueryParams = startNode?.data?.inputs?.webhookQueryParams
        const webhookQueryParams: Array<{ name: string; required: boolean }> = Array.isArray(rawQueryParams) ? rawQueryParams : []
        const missingQueryParams = webhookQueryParams.filter((p) => p.required && query?.[p.name] == null).map((p) => p.name)
        if (missingQueryParams.length > 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Missing required query parameters: ${missingQueryParams.join(', ')}`)
        }

        return { callbackUrl, callbackSecret }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: webhookService.validateWebhookChatflow - ${getErrorMessage(error)}`
        )
    }
}

export default {
    validateWebhookChatflow
}
