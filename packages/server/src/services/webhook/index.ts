import { StatusCodes } from 'http-status-codes'
import { IReactFlowObject, StartInputType } from '../../Interface'
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
): Promise<{ responseMode: 'sync' | 'async' | 'stream'; callbackUrl?: string; callbackSecret?: string }> => {
    try {
        const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
        const startNode = parsedFlowData.nodes.find((node) => node.data.name === 'startAgentflow')
        const startInputType = startNode?.data?.inputs?.startInputType as StartInputType | undefined

        if (startInputType !== 'webhookTrigger') {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} is not configured as a webhook trigger`)
        }

        const enableAuth = startNode?.data?.inputs?.webhookEnableAuth === true
        const enableValidation = startNode?.data?.inputs?.webhookEnableValidation === true
        // 'sync' (default) returns JSON when the flow finishes, 'async' returns 202 + optional
        // callback POST, 'stream' returns an SSE stream of token/step events.
        const rawResponseMode = startNode?.data?.inputs?.webhookResponseMode as string | undefined
        const responseMode: 'sync' | 'async' | 'stream' =
            rawResponseMode === 'async' || rawResponseMode === 'stream' ? rawResponseMode : 'sync'

        // callbackUrl is only meaningful in async mode — when omitted there, the flow runs
        // fire-and-forget (202 returned, no callback delivered).
        const callbackUrl = responseMode === 'async' ? (startNode?.data?.inputs?.callbackUrl as string | undefined) || undefined : undefined
        const callbackSecret =
            responseMode === 'async' ? (startNode?.data?.inputs?.callbackSecret as string | undefined) || undefined : undefined

        // Signature verification (runs before any other validation to fail-fast on bad auth)
        if (enableAuth) {
            const secret = await chatflowsService.getWebhookSecret(chatflowId, chatflow.workspaceId)
            if (!secret) {
                throw new InternalFlowiseError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Webhook signature verification is enabled but no secret has been generated. Open the Start node and click Generate Secret.'
                )
            }

            const sigHeader = ((startNode?.data?.inputs?.webhookSignatureHeader as string) || 'x-webhook-signature').toLowerCase()
            const sigType = (startNode?.data?.inputs?.webhookSignatureType as string) || 'hmac-sha256'
            const sigValue = (headers?.[sigHeader] ?? '') as string

            if (!sigValue) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Missing signature header: ${sigHeader}`)
            }

            const valid =
                sigType === 'plain-token'
                    ? verifyPlainToken(secret, sigValue)
                    : !!rawBody && verifyWebhookSignature(secret, rawBody, sigValue)

            if (!valid) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid webhook signature')
            }
        }

        if (options?.skipFieldValidation) return { responseMode, callbackUrl, callbackSecret }

        // Method validation
        const webhookMethod = startNode?.data?.inputs?.webhookMethod
        if (webhookMethod && method?.toUpperCase() !== webhookMethod.toUpperCase()) {
            throw new InternalFlowiseError(StatusCodes.METHOD_NOT_ALLOWED, `Method ${method} not allowed. Expected ${webhookMethod}`)
        }

        // Content-Type validation
        const hasBody = (rawBody && rawBody.length > 0) || (body != null && Object.keys(body).length > 0)
        const webhookContentType = startNode?.data?.inputs?.webhookContentType
        const incomingContentType = (headers?.['content-type'] ?? '').toLowerCase()
        if (webhookContentType && hasBody && !incomingContentType.startsWith(webhookContentType)) {
            throw new InternalFlowiseError(
                StatusCodes.UNSUPPORTED_MEDIA_TYPE,
                `Content-Type ${headers?.['content-type']} not allowed. Expected ${webhookContentType}`
            )
        }

        // Header / body / query shape validation runs only when the user has explicitly opted in.
        if (enableValidation) {
            // Required header validation
            const rawHeaderParams = startNode?.data?.inputs?.webhookHeaderParams
            const webhookHeaderParams: Array<{ name: string; required: boolean }> = Array.isArray(rawHeaderParams) ? rawHeaderParams : []
            const missingHeaders = webhookHeaderParams
                .filter((p) => p.required && headers?.[p.name.toLowerCase()] == null)
                .map((p) => p.name)
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
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `Missing required webhook body parameters: ${missingParams.join(', ')}`
                )
            }

            // Body type validation (only for params that have an explicit type declared)
            const typeMismatch = webhookBodyParams
                .filter((p) => {
                    if (p.type == null || body?.[p.name] == null) return false
                    const val = body[p.name]
                    if (p.type === 'number') return val === '' || isNaN(Number(val))
                    if (p.type === 'boolean') return typeof val !== 'boolean' && val !== 'true' && val !== 'false'
                    if (p.type === 'object') return typeof val !== 'object' || val === null || Array.isArray(val)
                    if (p.type === 'array[string]') return !Array.isArray(val) || (val as unknown[]).some((el) => typeof el !== 'string')
                    if (p.type === 'array[number]') return !Array.isArray(val) || (val as unknown[]).some((el) => typeof el !== 'number')
                    if (p.type === 'array[boolean]') return !Array.isArray(val) || (val as unknown[]).some((el) => typeof el !== 'boolean')
                    if (p.type === 'array[object]')
                        return (
                            !Array.isArray(val) ||
                            (val as unknown[]).some((el) => typeof el !== 'object' || el === null || Array.isArray(el))
                        )
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
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `Missing required query parameters: ${missingQueryParams.join(', ')}`
                )
            }
        }

        return { responseMode, callbackUrl, callbackSecret }
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
