import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { StatusCodes } from 'http-status-codes'
import { ChatMessageRatingType, ChatType } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn()
}))

import statsService from '.'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow } from '../../database/entities/ChatFlow'

const mockQb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    subQuery: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue('(SELECT DISTINCT cm2.sessionId FROM chat_message cm2)'),
    getParameters: jest.fn().mockReturnValue({}),
    getRawOne: jest.fn(),
    getRawMany: jest.fn()
}

const mockMessageRepo: any = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb)
}

const mockChatFlowRepo: any = {
    findOneBy: jest.fn()
}

const CHATFLOW_ID = 'cf-abc-123'
const WORKSPACE_ID = 'ws-xyz-456'

describe('statsService.getChatflowStats', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getRunningExpressApp as jest.Mock).mockReturnValue({
            AppDataSource: {
                getRepository: jest.fn((entity: unknown) => {
                    if (entity === ChatFlow) return mockChatFlowRepo
                    return mockMessageRepo
                })
            }
        })

        mockChatFlowRepo.findOneBy.mockResolvedValue({ id: CHATFLOW_ID } as any)
        mockQb.getRawOne.mockResolvedValue({ count: '0' })
        mockQb.getRawMany.mockResolvedValue([])
        mockQb.select.mockReturnThis()
        mockQb.addSelect.mockReturnThis()
        mockQb.from.mockReturnThis()
        mockQb.innerJoin.mockReturnThis()
        mockQb.leftJoin.mockReturnThis()
        mockQb.where.mockReturnThis()
        mockQb.andWhere.mockReturnThis()
        mockQb.setParameter.mockReturnThis()
        mockQb.setParameters.mockReturnThis()
        mockQb.subQuery.mockReturnThis()
        mockQb.getQuery.mockReturnValue('(SELECT DISTINCT cm2.sessionId FROM chat_message cm2)')
        mockQb.getParameters.mockReturnValue({})
        mockMessageRepo.createQueryBuilder.mockReturnValue(mockQb)
    })

    describe('workspace authorization', () => {
        it('throws when activeWorkspaceId is not provided', async () => {
            await expect(
                statsService.getChatflowStats(CHATFLOW_ID, undefined as any, undefined, undefined, undefined, undefined)
            ).rejects.toBeInstanceOf(InternalFlowiseError)

            expect(mockChatFlowRepo.findOneBy).not.toHaveBeenCalled()
        })

        it('throws when chatflow is not found in the workspace', async () => {
            mockChatFlowRepo.findOneBy.mockResolvedValue(null)

            await expect(
                statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, undefined)
            ).rejects.toBeInstanceOf(InternalFlowiseError)

            expect(mockMessageRepo.createQueryBuilder).not.toHaveBeenCalled()
        })

        it('looks up chatflow with the correct workspaceId', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, undefined)

            expect(mockChatFlowRepo.findOneBy).toHaveBeenCalledWith({
                id: CHATFLOW_ID,
                workspaceId: WORKSPACE_ID
            })
        })
    })

    describe('no filters', () => {
        it('returns the correct shape with parsed integers', async () => {
            mockQb.getRawOne.mockResolvedValueOnce({
                totalMessages: '157',
                totalSessions: '42',
                totalFeedback: '10',
                positiveFeedback: '7'
            })

            const result = await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, undefined)

            expect(result).toEqual({
                totalMessages: 157,
                totalSessions: 42,
                totalFeedback: 10,
                positiveFeedback: 7
            })
        })

        it('defaults to 0 when getRawOne returns undefined', async () => {
            mockQb.getRawOne.mockResolvedValue(undefined)

            const result = await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, undefined)

            expect(result.totalMessages).toBe(0)
            expect(result.totalSessions).toBe(0)
            expect(result.totalFeedback).toBe(0)
            expect(result.positiveFeedback).toBe(0)
        })

        it('runs 1 QueryBuilder and getRawOne 1 time when no feedbackTypes filter is set', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, undefined)

            expect(mockMessageRepo.createQueryBuilder).toHaveBeenCalledTimes(1)
            expect(mockQb.getRawOne).toHaveBeenCalledTimes(1)
        })
    })

    describe('chatTypes filter', () => {
        it('uses In operator with the provided chatTypes', async () => {
            const chatTypes: ChatType[] = [ChatType.INTERNAL]

            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, chatTypes, undefined, undefined, undefined)

            const whereArg = mockQb.where.mock.calls[0][0]
            expect(whereArg.chatType.type).toBe('in')
            expect(whereArg.chatType.value).toEqual(chatTypes)
        })
    })

    describe('date range filter', () => {
        it('uses Between when both startDate and endDate are provided', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, '2024-01-01', '2024-12-31', undefined)

            const whereArg = mockQb.where.mock.calls[0][0]
            expect(whereArg.createdDate.type).toBe('between')
        })

        it('uses MoreThanOrEqual when only startDate is provided', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, '2024-01-01', undefined, undefined)

            const whereArg = mockQb.where.mock.calls[0][0]
            expect(whereArg.createdDate.type).toBe('moreThanOrEqual')
        })

        it('uses LessThanOrEqual when only endDate is provided', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, '2024-12-31', undefined)

            const whereArg = mockQb.where.mock.calls[0][0]
            expect(whereArg.createdDate.type).toBe('lessThanOrEqual')
        })
    })

    describe('feedbackTypes filter', () => {
        it('returns all zeros when no sessions have qualifying feedback', async () => {
            mockQb.getRawOne.mockResolvedValue({ count: '0' })

            const result = await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, [
                ChatMessageRatingType.THUMBS_UP
            ])

            expect(result).toEqual({ totalMessages: 0, totalSessions: 0, totalFeedback: 0, positiveFeedback: 0 })
            // 1 combinedQb + 1 precedingCountQb = 2
            expect(mockQb.getRawOne).toHaveBeenCalledTimes(2)
        })

        it('computes totalMessages as totalFeedback + precedingCount when feedbackTypes is set', async () => {
            mockQb.getRawOne
                .mockResolvedValueOnce({ totalSessions: '42', totalFeedback: '67', positiveFeedback: '60' }) // combinedQb
                .mockResolvedValueOnce({ count: '57' }) // precedingCountQb

            const result = await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, [
                ChatMessageRatingType.THUMBS_UP
            ])

            // totalMessages = totalFeedback(67) + precedingCount(57) = 124
            expect(result.totalMessages).toBe(124)
            expect(result.totalSessions).toBe(42)
            expect(result.totalFeedback).toBe(67)
            expect(result.positiveFeedback).toBe(60)
            // 1 combinedQb + 1 precedingCountQb = 2
            expect(mockQb.getRawOne).toHaveBeenCalledTimes(2)
        })

        it('passes the feedbackTypes to the session subquery', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, [
                ChatMessageRatingType.THUMBS_DOWN
            ])

            const feedbackCall = mockQb.andWhere.mock.calls.find((call: string[]) => call[0].includes('feedbackTypes'))
            expect(feedbackCall).toBeDefined()
            expect(feedbackCall![1]).toEqual(expect.objectContaining({ feedbackTypes: [ChatMessageRatingType.THUMBS_DOWN] }))
        })

        it('appends the session subquery condition to the combined count query', async () => {
            await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, [
                ChatMessageRatingType.THUMBS_UP
            ])

            const sessionIdCalls = mockQb.andWhere.mock.calls.filter((call: string[]) => call[0].includes('cm.sessionId IN'))
            expect(sessionIdCalls.length).toBe(1)
        })
    })

    describe('error handling', () => {
        it('wraps unexpected errors as InternalFlowiseError with 500 status', async () => {
            mockQb.getRawOne.mockRejectedValue(new Error('DB connection lost'))

            let caught: any
            try {
                await statsService.getChatflowStats(CHATFLOW_ID, WORKSPACE_ID, undefined, undefined, undefined, undefined)
            } catch (e) {
                caught = e
            }

            expect(caught).toBeInstanceOf(InternalFlowiseError)
            expect(caught.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
            expect(caught.message).toContain('statsService.getChatflowStats')
        })
    })
})
