import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'

const mockGetChatflowByIdForWorkspace = jest.fn()
const mockGetAllChatMessageFeedback = jest.fn()

jest.mock('../../services/chatflows', () => ({
    __esModule: true,
    default: { getChatflowByIdForWorkspace: mockGetChatflowByIdForWorkspace }
}))
jest.mock('../../services/feedback', () => ({
    __esModule: true,
    default: { getAllChatMessageFeedback: mockGetAllChatMessageFeedback }
}))
jest.mock('../../services/feedback/validation', () => ({
    validateFeedbackForCreation: jest.fn(),
    validateFeedbackForUpdate: jest.fn()
}))

import feedbackController from './index'

const CHATFLOW_ID = 'chatflow-1'
const WORKSPACE_ID = 'workspace-1'

const mockReq = (overrides: Partial<Request> = {}): Request =>
    ({
        params: { id: CHATFLOW_ID },
        query: {},
        user: { activeWorkspaceId: WORKSPACE_ID },
        ...overrides
    } as unknown as Request)

const mockRes = (): Response => {
    const res = {} as Response
    res.json = jest.fn().mockReturnValue(res)
    res.status = jest.fn().mockReturnValue(res)
    return res
}

const mockNext = (): NextFunction => jest.fn()

describe('getAllChatMessageFeedback', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetChatflowByIdForWorkspace.mockResolvedValue({ id: CHATFLOW_ID })
        mockGetAllChatMessageFeedback.mockResolvedValue([])
    })

    it('calls next with PRECONDITION_FAILED when id is missing', async () => {
        const req = mockReq({ params: {} as any })
        const res = mockRes()
        const next = mockNext()

        await feedbackController.getAllChatMessageFeedback(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.PRECONDITION_FAILED }))
        expect(mockGetAllChatMessageFeedback).not.toHaveBeenCalled()
    })

    // Regression test for the unauthenticated IDOR: /api/v1/feedback is in WHITELIST_URLS,
    // so an anonymous caller reaches this handler with no req.user. It must fail closed.
    it('calls next with NOT_FOUND and does not read feedback when the caller is anonymous', async () => {
        const req = mockReq({ user: undefined })
        const res = mockRes()
        const next = mockNext()

        await feedbackController.getAllChatMessageFeedback(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.NOT_FOUND }))
        expect(mockGetChatflowByIdForWorkspace).not.toHaveBeenCalled()
        expect(mockGetAllChatMessageFeedback).not.toHaveBeenCalled()
    })

    it('calls next with NOT_FOUND when the chatflow is not in the caller workspace', async () => {
        mockGetChatflowByIdForWorkspace.mockResolvedValue(null)

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await feedbackController.getAllChatMessageFeedback(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.NOT_FOUND }))
        expect(mockGetAllChatMessageFeedback).not.toHaveBeenCalled()
    })

    it('scopes the ownership check to the caller active workspace', async () => {
        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await feedbackController.getAllChatMessageFeedback(req, res, next)

        expect(mockGetChatflowByIdForWorkspace).toHaveBeenCalledWith(CHATFLOW_ID, WORKSPACE_ID)
    })

    it('returns feedback when the chatflow belongs to the caller workspace', async () => {
        const feedback = [{ id: 'feedback-1' }]
        mockGetAllChatMessageFeedback.mockResolvedValue(feedback)

        const req = mockReq({ query: { chatId: 'chat-1', order: 'ASC' } as any })
        const res = mockRes()
        const next = mockNext()

        await feedbackController.getAllChatMessageFeedback(req, res, next)

        expect(mockGetAllChatMessageFeedback).toHaveBeenCalledWith(CHATFLOW_ID, 'chat-1', 'ASC', undefined, undefined)
        expect(res.json).toHaveBeenCalledWith(feedback)
        expect(next).not.toHaveBeenCalled()
    })
})
