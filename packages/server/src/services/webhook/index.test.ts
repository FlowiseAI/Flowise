import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const mockGetChatflowById = jest.fn()
const mockGetWebhookSecret = jest.fn()

jest.mock('../chatflows', () => ({
    __esModule: true,
    default: { getChatflowById: mockGetChatflowById, getWebhookSecret: mockGetWebhookSecret }
}))

import webhookService from './index'

const makeChatflow = (
    startInputType: string,
    inputs?: {
        webhookBodyParams?: unknown
        webhookMethod?: string
        webhookContentType?: string
        webhookHeaderParams?: unknown
        webhookQueryParams?: unknown
        webhookEnableAuth?: boolean
        webhookEnableCallback?: boolean
        webhookEnableValidation?: boolean
        callbackUrl?: string
        callbackSecret?: string
    },
    entityFields?: { webhookSecretConfigured?: boolean }
) => ({
    id: 'test-id',
    ...entityFields,
    flowData: JSON.stringify({
        nodes: [
            {
                id: 'startAgentflow_0',
                data: {
                    name: 'startAgentflow',
                    inputs: {
                        startInputType,
                        ...inputs
                    }
                }
            }
        ],
        edges: []
    })
})

describe('validateWebhookChatflow', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('throws 404 when chatflow is not found', async () => {
        mockGetChatflowById.mockResolvedValue(null)

        await expect(webhookService.validateWebhookChatflow('missing-id')).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND
        })
    })

    it('throws 404 when chatflow is not configured as a webhook trigger', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('chatInput'))

        await expect(webhookService.validateWebhookChatflow('some-id')).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND
        })
    })

    it('resolves without error for a valid webhook chatflow', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger'))

        await expect(webhookService.validateWebhookChatflow('some-id')).resolves.toMatchObject({})
    })

    it('throws 500 for unexpected errors from getChatflowById', async () => {
        mockGetChatflowById.mockRejectedValue(new Error('db connection failed'))

        await expect(webhookService.validateWebhookChatflow('some-id')).rejects.toMatchObject({
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        })
    })

    it('preserves InternalFlowiseError without wrapping', async () => {
        const original = new InternalFlowiseError(StatusCodes.NOT_FOUND, 'already an internal error')
        mockGetChatflowById.mockRejectedValue(original)

        await expect(webhookService.validateWebhookChatflow('some-id')).rejects.toBe(original)
    })

    // --- Method validation ---

    it('throws 405 when HTTP method does not match configured webhookMethod', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', { webhookMethod: 'POST' }))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'GET')).rejects.toMatchObject({
            statusCode: StatusCodes.METHOD_NOT_ALLOWED
        })
    })

    it('resolves for any method when webhookMethod is not configured', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger'))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'DELETE')).resolves.toMatchObject({})
    })

    // --- Content-Type validation ---

    it('throws 415 when Content-Type does not match configured webhookContentType', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', { webhookContentType: 'application/json' }))

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, { foo: 'bar' }, 'POST', { 'content-type': 'text/plain' })
        ).rejects.toMatchObject({ statusCode: StatusCodes.UNSUPPORTED_MEDIA_TYPE })
    })

    it('resolves when Content-Type starts with configured value (handles charset suffix)', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', { webhookContentType: 'application/json' }))

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, { foo: 'bar' }, 'POST', {
                'content-type': 'application/json; charset=utf-8'
            })
        ).resolves.toMatchObject({})
    })

    it('resolves when webhookContentType is not configured', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger'))

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, { foo: 'bar' }, 'POST', { 'content-type': 'text/plain' })
        ).resolves.toMatchObject({})
    })

    it('skips Content-Type check when request has no body (empty POST ping)', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', { webhookContentType: 'application/json' }))

        // Empty body, no Content-Type header — common for Postman pings before a body is filled in.
        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {})).resolves.toMatchObject({})
    })

    // --- Header validation ---

    it('throws 400 when a required header is missing', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookHeaderParams: [{ name: 'x-api-key', required: true }] })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {})).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('x-api-key')
        })
    })

    it('resolves when all required headers are present', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookHeaderParams: [{ name: 'x-api-key', required: true }] })
        )

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', { 'x-api-key': 'secret' })
        ).resolves.toMatchObject({})
    })

    // --- Body param validation ---

    it('throws 400 when a required param is missing from body', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookBodyParams: [{ name: 'action', required: true }] })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {})).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST
        })
    })

    it('includes the missing field name in the 400 error message', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookBodyParams: [{ name: 'action', required: true }] })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {})).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('action')
        })
    })

    it('resolves when all required params are present in body', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookBodyParams: [{ name: 'action', required: true }] })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { action: 'push' })).resolves.toMatchObject({})
    })

    it('resolves when webhookBodyParams is empty string (DB default)', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookBodyParams: '' }))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {})).resolves.toMatchObject({})
    })

    it('resolves when no params declared but body has arbitrary fields', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger'))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { anything: 'goes' })).resolves.toMatchObject({})
    })

    // --- Body type validation ---

    it('throws 400 when a declared body param has wrong type', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'count', type: 'number', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { count: 'not-a-number' })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('count')
        })
    })

    it('resolves when declared body param has correct type', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'count', type: 'number', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { count: 42 })).resolves.toMatchObject({})
    })

    it('resolves when number param is sent as a numeric string (form-encoded)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'count', type: 'number', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { count: '42' })).resolves.toMatchObject({})
    })

    it('throws 400 when number param is an empty string (form-encoded)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'count', type: 'number', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { count: '' })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('count')
        })
    })

    it('resolves when boolean param is a native boolean (JSON)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'active', type: 'boolean', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { active: true })).resolves.toMatchObject({})
    })

    it('resolves when boolean param is the string "true" (form-encoded)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'active', type: 'boolean', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { active: 'true' })).resolves.toMatchObject({})
    })

    it('resolves when boolean param is the string "false" (form-encoded)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'active', type: 'boolean', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { active: 'false' })).resolves.toMatchObject({})
    })

    it('throws 400 when boolean param is an invalid string like "yes" (form-encoded)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'active', type: 'boolean', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { active: 'yes' })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('active')
        })
    })

    // --- object type ---

    it('resolves when object param is a plain object', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'meta', type: 'object', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { meta: { key: 'val' } })).resolves.toMatchObject({})
    })

    it('throws 400 when object param is a string', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'meta', type: 'object', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { meta: 'hello' })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('meta')
        })
    })

    it('throws 400 when object param is an array', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'meta', type: 'object', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { meta: [1, 2] })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('meta')
        })
    })

    // --- array[string] type ---

    it('resolves when array[string] param is an array of strings', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'tags', type: 'array[string]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { tags: ['a', 'b'] })).resolves.toMatchObject({})
    })

    it('throws 400 when array[string] param contains non-strings', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'tags', type: 'array[string]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { tags: [1, 2] })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('tags')
        })
    })

    it('throws 400 when array[string] param is not an array', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'tags', type: 'array[string]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { tags: 'hello' })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('tags')
        })
    })

    // --- array[number] type ---

    it('resolves when array[number] param is an array of numbers', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'scores', type: 'array[number]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { scores: [1, 2, 3] })).resolves.toMatchObject({})
    })

    it('throws 400 when array[number] param contains non-numbers', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'scores', type: 'array[number]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { scores: ['a', 'b'] })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('scores')
        })
    })

    // --- array[boolean] type ---

    it('resolves when array[boolean] param is an array of booleans', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'flags', type: 'array[boolean]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { flags: [true, false] })).resolves.toMatchObject({})
    })

    it('throws 400 when array[boolean] param contains boolean strings (no coercion for array elements)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'flags', type: 'array[boolean]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { flags: ['true', 'false'] })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('flags')
        })
    })

    // --- array[object] type ---

    it('resolves when array[object] param is an array of plain objects', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'items', type: 'array[object]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { items: [{ a: 1 }, { b: 2 }] })).resolves.toMatchObject(
            {}
        )
    })

    it('throws 400 when array[object] param contains non-objects', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'items', type: 'array[object]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { items: ['a', 'b'] })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('items')
        })
    })

    it('throws 400 when array[object] param contains nested arrays', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', {
                webhookEnableValidation: true,
                webhookBodyParams: [{ name: 'items', type: 'array[object]', required: false }]
            })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { items: [[1, 2]] })).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('items')
        })
    })

    // --- Query param validation ---

    it('throws 400 when a required query param is missing', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookQueryParams: [{ name: 'page', required: true }] })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {}, {})).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('page')
        })
    })

    it('resolves when all required query params are present', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookQueryParams: [{ name: 'page', required: true }] })
        )

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {}, { page: '2' })).resolves.toMatchObject({})
    })

    // --- HMAC signature verification ---

    const SECRET = 'test-secret-abc123'
    const RAW_BODY = Buffer.from('{"event":"push"}')

    function sign(secret: string, body: Buffer): string {
        const { createHmac } = require('crypto')
        return createHmac('sha256', secret).update(body).digest('hex')
    }

    it('resolves without signature check when no webhookSecret is configured', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger'))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {}, {}, RAW_BODY)).resolves.toMatchObject({})
    })

    it('resolves when secret is set and signature is valid', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableAuth: true }, { webhookSecretConfigured: true })
        )
        mockGetWebhookSecret.mockResolvedValue(SECRET)
        const headers = { 'x-webhook-signature': sign(SECRET, RAW_BODY) }

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', headers, {}, RAW_BODY)
        ).resolves.toMatchObject({})
    })

    it('throws 401 when secret is set but X-Webhook-Signature header is missing', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableAuth: true }, { webhookSecretConfigured: true })
        )
        mockGetWebhookSecret.mockResolvedValue(SECRET)

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {}, {}, RAW_BODY)).rejects.toMatchObject({
            statusCode: 401,
            message: expect.stringContaining('Missing signature header')
        })
    })

    it('throws 500 with config hint when auth is enabled but no secret has been generated', async () => {
        // Toggle on, but getWebhookSecret returns null (no secret generated yet)
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', { webhookEnableAuth: true }))
        mockGetWebhookSecret.mockResolvedValue(null)
        const headers = { 'x-webhook-signature': sign(SECRET, RAW_BODY) }

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', headers, {}, RAW_BODY)).rejects.toMatchObject(
            {
                statusCode: 500,
                message: expect.stringContaining('Generate Secret')
            }
        )
    })

    it('throws 401 when secret is set but signature is wrong', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableAuth: true }, { webhookSecretConfigured: true })
        )
        mockGetWebhookSecret.mockResolvedValue(SECRET)
        const headers = { 'x-webhook-signature': 'deadbeef' }

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', headers, {}, RAW_BODY)).rejects.toMatchObject(
            {
                statusCode: 401
            }
        )
    })

    it('throws 401 when payload is tampered (signature computed against original body)', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableAuth: true }, { webhookSecretConfigured: true })
        )
        mockGetWebhookSecret.mockResolvedValue(SECRET)
        const tamperedBody = Buffer.from('{"event":"delete"}')
        const headers = { 'x-webhook-signature': sign(SECRET, RAW_BODY) }

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', headers, {}, tamperedBody)
        ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 when secret is set but rawBody is undefined', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableAuth: true }, { webhookSecretConfigured: true })
        )
        mockGetWebhookSecret.mockResolvedValue(SECRET)
        const headers = { 'x-webhook-signature': sign(SECRET, RAW_BODY) }

        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', headers, {}, undefined)
        ).rejects.toMatchObject({ statusCode: 401 })
    })

    // --- skipFieldValidation option (resume calls) ---

    it('skips field validation when skipFieldValidation is true', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableValidation: true, webhookBodyParams: [{ name: 'action', required: true }] })
        )

        // Missing required body param 'action' — would normally throw 400, but not on resume
        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {}, {}, undefined, { skipFieldValidation: true })
        ).resolves.toMatchObject({})
    })

    it('still runs signature check when skipFieldValidation is true', async () => {
        mockGetChatflowById.mockResolvedValue(
            makeChatflow('webhookTrigger', { webhookEnableAuth: true }, { webhookSecretConfigured: true })
        )
        mockGetWebhookSecret.mockResolvedValue(SECRET)

        // No signature header — should still 401 even with skipFieldValidation
        await expect(
            webhookService.validateWebhookChatflow('some-id', undefined, {}, 'POST', {}, {}, RAW_BODY, { skipFieldValidation: true })
        ).rejects.toMatchObject({ statusCode: 401 })
    })
})
