import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const mockGetChatflowById = jest.fn()

jest.mock('../chatflows', () => ({
    __esModule: true,
    default: { getChatflowById: mockGetChatflowById }
}))

import webhookService from './index'

const makeChatflow = (startInputType: string, webhookBodyParams?: unknown) => ({
    id: 'test-id',
    flowData: JSON.stringify({
        nodes: [
            {
                id: 'startAgentflow_0',
                data: {
                    name: 'startAgentflow',
                    inputs: {
                        startInputType,
                        ...(webhookBodyParams !== undefined && { webhookBodyParams })
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

        await expect(webhookService.validateWebhookChatflow('some-id')).resolves.toBeUndefined()
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

    it('throws 400 when a required param is missing from body', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', [{ name: 'action', required: true }]))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {})).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST
        })
    })

    it('includes the missing field name in the 400 error message', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', [{ name: 'action', required: true }]))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {})).rejects.toMatchObject({
            statusCode: StatusCodes.BAD_REQUEST,
            message: expect.stringContaining('action')
        })
    })

    it('resolves when all required params are present in body', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', [{ name: 'action', required: true }]))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { action: 'push' })).resolves.toBeUndefined()
    })

    it('resolves when webhookBodyParams is empty string (DB default)', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger', ''))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, {})).resolves.toBeUndefined()
    })

    it('resolves when no params declared but body has arbitrary fields', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow('webhookTrigger'))

        await expect(webhookService.validateWebhookChatflow('some-id', undefined, { anything: 'goes' })).resolves.toBeUndefined()
    })
})
